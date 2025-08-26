import cors from 'cors';
import path from 'path';
import express from 'express';
import process from 'process';
import { fileURLToPath } from 'url';
import { fork, spawn } from 'child_process';
import readRtc from './hardware/rtc.js';
import managePump from './hardware/pump.js';
import SerialPort from "serialport";
import toggleCooler from './hardware/cooler.js';
import readCpuTemp from './hardware/cpu_temp.js';
import readTubeSensor from './hardware/tubesensors.js';
import modbusServerLaunch from './communication/jsmodbus-server.js';

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// in ms
const tempInquirePeriod = 3000;
const tubeSensorInquirePeriod = 1000;
const rtcInquirePeriod = 5000;
const cpuTempInquirePeriod = 5000;
const flowInquirePeriod = 1000;

let isCoolerOn = false;

let pumpSpeed = 0;
let pumpDir = 'CW';
let pumpMode = 'Continuous dosing';

let servoPosition = 0;
let chamberTemps = [null, null, null];
let isTubeEmpty = true;
let caseTemperature = null;
let dateTime = null;
let cpuTemperature = null;
let isModBusOK = null;
let flow = 0;

app.listen(port, () => {
  console.log(`\nBackend is listening at http://localhost:${port}\n`);
});

modbusServerLaunch()
  .then(() => { 
    isModBusOK = true;
    console.log('\nSuccessfully connected to the Serial Port');
  })
  .catch(() => {
    isModBusOK = false;
    console.error('\n---Could not connect to the Serial Port!---\n');
  });

const chamberTempsProcess = fork(__dirname + '/hardware/tempsensors.js');
chamberTempsProcess.on('message', (data) => {
  chamberTemps = data;
});
chamberTempsProcess.on('close', (code) => {
  console.log(`Chamber temperatures process exited with code ${code}`);
});
const inquireChamberTemps = async () => {
  await chamberTempsProcess.send('Give me the chamber temperatures');
};
setInterval(inquireChamberTemps, tempInquirePeriod);

const inquireTubeSensor = async () => {
  isTubeEmpty = await readTubeSensor();
};
setInterval(inquireTubeSensor, tubeSensorInquirePeriod);

const inquireRtc = async () => {
  try {
    const rtcData = await Promise.all(readRtc());
    dateTime = rtcData[0];
    caseTemperature = rtcData[1];
  }
  catch (err) {
    console.error(err);
  }
};
setInterval(inquireRtc, rtcInquirePeriod);

const inquireCpuTemp = async () => {
  cpuTemperature = await readCpuTemp();
};
setInterval(inquireCpuTemp, cpuTempInquirePeriod);

const flowMeterProcess = fork(__dirname + '/hardware/flowmeter.js');
flowMeterProcess.on('message', (data) => {
  flow = data;
  console.log(`Flow meter rate: ${flow}`);
});
flowMeterProcess.on('close', (code) => {
  console.log(`Flow meter process exited with code ${code}`);
});
const inquireFlow = async () => {
  await flowMeterProcess.send('Give me the flow rate');
};
setInterval(inquireFlow, flowInquirePeriod);

app.get('/coolerStatus', (req, res) => {
  res.send(isCoolerOn);
});

app.get('/toggleCooler',  (req, res) => {
  const pendingStatus = !isCoolerOn;
  toggleCooler(pendingStatus);
  isCoolerOn = !isCoolerOn;
  res.send(pendingStatus);
});

app.get('/pumpStatus', (req, res) => {
  res.send([pumpSpeed, pumpDir]);
});

app.get('/servoStatus', (req, res) => {
  res.send(servoPosition);
});

app.get('/temperatures', (req, res) => {
  res.send(chamberTemps);
});

app.get('/caseTemperature', (req, res) => {
  res.send(caseTemperature);
});

app.get('/cpuTemperature', (req, res) => {
  res.send(cpuTemperature);
});

app.get('/dateTime', (req, res) => {
  res.send(dateTime);
});

app.get('/tubeSensorStatus', (req, res) => {
  res.send(isTubeEmpty);
});

app.get('/modbusStatus', (req, res) => {
  res.send(isModBusOK);
});

app.get('/flow', (req, res) => {
  res.send(flow);
});

app.post('/managePump', async (req, res) => {
  console.log('\nReceived manage pump request:');
  console.table(req.body);
  console.log();

  const { speed, direction, mode, time, volume } = req.body;
  managePump(speed, direction, mode, time, volume)
    .then(newSpeed => {
      pumpSpeed = newSpeed;
      pumpDir = direction;
      pumpMode = mode;
      res.json({ message: 'New pump settings:', data: { speed: pumpSpeed, direction, mode } });
    })
    .catch(err => {
      console.error(err);
    })
});

app.post('/manageServo', (req, res) => {
  const getCp2102PortPath = async () => {
    const ports = await SerialPort.SerialPort.list();
    const [cp2102Port] = ports.filter((port) => port.pnpId === "usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0");
    if (!cp2102Port) {
      throw new Error('USB-CP2102 not found');
    }
    const { path } = cp2102Port;
    console.log("SERVO PORT PATH:", path);
    return path;
  };

  getCp2102PortPath()
    .then((path) => {
      const requestedAngle = req.body.angle;
      const pythonVenvPath = __dirname + '/hardware/st3215/python/venv/bin/python';
      const pyScriptPath = __dirname + '/hardware/st3215/python/servo.py';
      const pythonProcess = spawn(pythonVenvPath, [pyScriptPath]);
      pythonProcess.stdin.write(`${path},${requestedAngle}\n`);
      pythonProcess.stdin.end();
      
      pythonProcess.stdout.on('data', (newAngle) => {
        console.log(`Received from Python script: ${newAngle.toString().trim()}`);
        servoPosition = Number(newAngle);
        res.json({ message: 'New servo position is', data: { position: servoPosition } });
      });

      pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data.toString()}`);
      res.json({ message: 'Servo python error', data: { position: servoPosition } });
      });
    })
    .catch((err) => {
      console.error(err);
      res.json({ message: 'Servo manage error', data: { position: servoPosition } });
    });
});

process.on('uncaughtException', (err, origin) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.log('Error source:', origin);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);    
});
