import sensor from "ds18x20";

console.log("\nChecking temperature sensors...");
const sensorsIDs = sensor.list().filter((id) => id.startsWith("28-"));
// const sensorsIDs = ['28-00000053e471', '28-8b96451f64ff', '28-8b96451f64ff'];
console.log({ sensorsIDs });

const period = 3000; // <3000 is useless
const temperatures = [null, null, null];

if (sensorsIDs.length === 0) {
  console.warn(
    "Please connect at least 1 temperature sensor and restart the app",
  );
}

const inquireTemps = () => {
  sensorsIDs.forEach((sensorId, i) => {
    sensor.get(sensorId, (error, data) => {
      if (error) {
        console.error(error);
      } else {
        console.log(sensorId, data);
        temperatures[i] = data;
      }
    });
  });
};

setInterval(inquireTemps, period);

process.on("message", () => {
  process.send(temperatures);
});
