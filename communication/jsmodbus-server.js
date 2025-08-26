import modbus from "jsmodbus";
import SerialPort from "serialport";

const serialNum = "FTB6SPL3";

const getPortPath = async (serNum) => {
  const ports = await SerialPort.SerialPort.list();
  console.table(
    ports.map((port) => [port.path, port.manufacturer, port.serialNumber]),
  );
  const [rs485Port] = ports.filter((port) => port.serialNumber === serNum);
  const { path } = rs485Port;
  return path;
};

const modbusServerLaunch = async () => {
  const portPath = await getPortPath(serialNum);
  if (!portPath) {
    console.error("USB-RS485 converter not found!");
    throw new Error();
  } else {
    console.log("USB-RS485 converter found on", portPath);
  }

  const port = await new SerialPort.SerialPort({
    path: portPath,
    baudRate: 9600,
    dataBits: 8,
    parity: "none",
    stopBits: 1,
  });

  port.on("error", (err) => {
    console.error("Serial port error detected:", err.message);
    throw new Error(err);
  });

  const server = new modbus.server.RTU(port, {
    unitID: 1,
    buffer: Buffer.alloc(10000),
  });

  port.on("open", () => {
    console.log("Serial port opened. Modbus RTU server listening...");
  });
  port.on("data", (data) => {
    console.log("Incoming raw data:", data);
  });
  server.on("connection", () => {
    console.log("Connection established succesfully");
  });
  server.on("error", (error) => {
    console.error(error);
  });
  server.on("preReadCoils", (message) => {
    console.log("Read coils message received:\n", message);
  });
  server.on("preWriteSingleCoil", (message) => {
    console.log("Write Single Coil message received:\n", message);
  });
  server.on("preWriteMultipleCoils", (message) => {
    console.log("Write Multiple Coils message received:\n", message);
  });
  server.on("preReadHoldingRegisters", (message) => {
    console.log("Read Holding Registers message received:\n", message);
  });
  server.on("preReadDiscreteInputs", (message) => {
    console.log("Read Discrete Inputs message received:\n", message);
  });
  server.on("preReadInputRegisters", (message) => {
    console.log("Read Input Registers message received:\n", message);
  });
  server.on("preWriteMultipleRegisters", (message) => {
    console.log("Write Multiple Registers message received:\n", message);
  });
};

export default modbusServerLaunch;
