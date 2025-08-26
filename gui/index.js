/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable import-x/extensions */

import {
  ccwDirRadioElt,
  chamberTempFields,
  coolerBtn,
  coolerBtnSpan,
  coolerSpinner,
  cpuTempElt,
  cwDirRadioElt,
  dateTimeField,
  flowElement,
  modbusStatusField,
  pumpBtnSpan,
  pumpButton,
  pumpContinuousModeRadioElt,
  pumpDiscreteByTimeRadioElt,
  pumpDiscreteByVolRadioElt,
  pumpSpeedInput,
  pumpSpeedOutput,
  pumpSpinner,
  rtcTempField,
  servoAngleInput,
  servoAngleOutput,
  servoButton,
  servoStatusElt,
  timeInputElt,
  tubeSensorField,
  volumeInputElt,
} from "./elements.js";
import {
  setChamberTempFieldStyle,
  setCoolerBtnStyle,
  setCpuTempBtnStyle,
  setDateTimeEltStyle,
  setFlowEltStyle,
  setModbusFieldStyle,
  setPumpElementsStyle,
  setRtcTempEltStyle,
  setServoStatusEltStyle,
  setTubeSensorFieldStyle,
} from "./stylers.js";

const hostAddress = "http://localhost:3000/";

const chambTempWarnThreshold = 4.5;
const rtcTempWarnThreshold = 35;
const cpuTempThreshold = 75;
const chamberTempsUpdatePeriod = 3000;
const tubeSensorUpdatePeriod = 1000;
const rtcDataUpdatePeriod = 10000;
const cpuTempUpdatePeriod = 5000;
const flowUpdatePeriod = 1000;

const fetchChamberTempsAndUpdElts = async () => {
  const temperaturesResponse = await fetch(`${hostAddress}temperatures`);
  const temps = await temperaturesResponse.json();
  if (temps.every((element) => element === null)) {
    console.error("No response from chamber temperature sensors...");
  } else {
    // console.log('Current temperatures:', temps);
    chamberTempFields.forEach((field, i) => {
      setChamberTempFieldStyle(field, temps[i], chambTempWarnThreshold);
    });
  }
};

const fetchCoolerStatusAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}coolerStatus`);
  const isCoolerOn = await response.json();
  // console.log({isCoolerOn});
  coolerBtn.disabled = false;
  setCoolerBtnStyle(coolerBtn, coolerBtnSpan, coolerSpinner, isCoolerOn);
};

const fetchPumpStatusAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}pumpStatus`);
  const [spd, dir] = await response.json();
  // console.table([spd, dir]);
  pumpButton.disabled = false;
  setPumpElementsStyle(
    pumpButton,
    pumpBtnSpan,
    pumpSpeedInput,
    cwDirRadioElt,
    ccwDirRadioElt,
    pumpSpinner,
    spd > 0,
    dir,
    pumpContinuousModeRadioElt,
    pumpDiscreteByTimeRadioElt,
    pumpDiscreteByVolRadioElt,
  );
};

const fetchModbusStatusAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}modbusStatus`);
  const isModbusReady = await response.json();
  // console.log(isModbusReady);
  setModbusFieldStyle(modbusStatusField, isModbusReady);
};

const fetchServoStatusAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}servoStatus`);
  const servoAngle = await response.json();
  // console.log({servoAngle});
  setServoStatusEltStyle(servoStatusElt, servoAngle);
};

const fetchDateTimeAndUpdElt = async () => {
  const dateTimeResponse = await fetch(`${hostAddress}dateTime`);
  const dateTime = await dateTimeResponse.json();
  // console.log({dateTime});
  setDateTimeEltStyle(dateTimeField, dateTime);
};

const fetchRtcTempAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}caseTemperature`);
  const rtcTemp = await response.json();
  // console.log({ rtcTemp });
  setRtcTempEltStyle(rtcTempField, rtcTemp, rtcTempWarnThreshold);
};

const fetchTubeSensorAndUpdElt = async () => {
  const tubeSensorResponse = await fetch(`${hostAddress}tubeSensorStatus`);
  const isTubeEmpty = await tubeSensorResponse.json();
  // console.log({ isTubeEmpty });
  setTubeSensorFieldStyle(tubeSensorField, isTubeEmpty);
};

const fetchCpuTempAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}cpuTemperature`);
  const cpuT = await response.json();
  // console.log({ cpuT });
  setCpuTempBtnStyle(cpuTempElt, cpuT, cpuTempThreshold);
};

const fetchFlowAndUpdElt = async () => {
  const response = await fetch(`${hostAddress}flow`);
  const flow = await response.json();
  setFlowEltStyle(flowElement, flow);
};

let speed = Number(pumpSpeedInput.textContent || pumpSpeedInput.value);
pumpSpeedOutput.textContent = speed;

let angle = Number(servoAngleInput.textContent || servoAngleInput.value);
servoAngleOutput.textContent = `${angle}⁰`;

coolerSpinner.style.display = "none";
pumpSpinner.style.display = "none";

coolerBtn.addEventListener("click", async () => {
  try {
    const response = await fetch(`${hostAddress}toggleCooler`);
    const isCoolerOn = await response.json();
    setCoolerBtnStyle(coolerBtn, coolerBtnSpan, coolerSpinner, isCoolerOn);
  } catch (error) {
    console.error(error);
  }
});

pumpButton.addEventListener("click", async () => {
  pumpButton.disabled = true;
  cwDirRadioElt.disabled = true;
  ccwDirRadioElt.disabled = true;
  pumpContinuousModeRadioElt.disabled = true;
  pumpDiscreteByTimeRadioElt.disabled = true;
  pumpDiscreteByVolRadioElt.disabled = true;

  const resp = await fetch(`${hostAddress}pumpStatus`);
  const [crntSpd] = await resp.json();
  const speedToRequest = crntSpd > 0 ? 0 : speed;
  const dirToRequest = cwDirRadioElt.checked ? "CW" : "CCW";

  const determinePumpMode = (elements) => {
    const [checkedElt] = elements.filter((elt) => elt.checked);
    return checkedElt.id;
  };

  const reqMode = determinePumpMode([
    pumpContinuousModeRadioElt,
    pumpDiscreteByTimeRadioElt,
    pumpDiscreteByVolRadioElt,
  ]);
  const reqTime = timeInputElt.valueAsNumber;
  const reqVolume = volumeInputElt.valueAsNumber;
  const response = await fetch(`${hostAddress}managePump`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      speed: speedToRequest,
      direction: dirToRequest,
      mode: reqMode,
      time: reqTime,
      volume: reqVolume,
    }),
  });
  const parsedResponse = await response.json();
  console.table(parsedResponse.data);
  console.log("Pump speed is", parsedResponse.data.speed, "now");
  const isPumpOn = parsedResponse.data.speed > 0;
  const newDir = parsedResponse.data.direction;

  pumpButton.disabled = false;
  cwDirRadioElt.disabled = false;
  ccwDirRadioElt.disabled = false;
  pumpContinuousModeRadioElt.disabled = false;
  pumpDiscreteByTimeRadioElt.disabled = false;
  pumpDiscreteByVolRadioElt.disabled = false;

  setPumpElementsStyle(
    pumpButton,
    pumpBtnSpan,
    pumpSpeedInput,
    cwDirRadioElt,
    ccwDirRadioElt,
    pumpSpinner,
    isPumpOn,
    newDir,
    pumpContinuousModeRadioElt,
    pumpDiscreteByTimeRadioElt,
    pumpDiscreteByVolRadioElt,
  );
});

pumpSpeedInput.addEventListener("input", () => {
  pumpSpeedOutput.textContent = pumpSpeedInput.value;
  speed = pumpSpeedInput.valueAsNumber;
});

servoButton.addEventListener("click", async () => {
  const response = await fetch(`${hostAddress}manageServo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ angle }),
  });
  const parsedResponse = await response.json();
  const newPosition = parsedResponse.data.position;
  setServoStatusEltStyle(servoStatusElt, newPosition);
});

servoAngleInput.addEventListener("input", () => {
  servoAngleOutput.textContent = `${servoAngleInput.value}⁰`;
  angle = servoAngleInput.valueAsNumber;
});

fetchCoolerStatusAndUpdElt();
fetchPumpStatusAndUpdElt();
fetchServoStatusAndUpdElt();
fetchModbusStatusAndUpdElt();
fetchDateTimeAndUpdElt();
fetchRtcTempAndUpdElt();
fetchCpuTempAndUpdElt();
fetchFlowAndUpdElt();

setInterval(fetchChamberTempsAndUpdElts, chamberTempsUpdatePeriod);
setInterval(fetchTubeSensorAndUpdElt, tubeSensorUpdatePeriod);
setInterval(fetchRtcTempAndUpdElt, rtcDataUpdatePeriod);
setInterval(fetchDateTimeAndUpdElt, rtcDataUpdatePeriod);
setInterval(fetchCpuTempAndUpdElt, cpuTempUpdatePeriod);
setInterval(fetchFlowAndUpdElt, flowUpdatePeriod);
