const moveServo = (prevAngle, angleToGo) => {
  // console.log("\nPrevious Servo position was", prevAngle, "⁰");
  // console.log("Rotating Servo by", angleToGo, "⁰...\n");
  if (prevAngle + angleToGo > 360) {
    return prevAngle + angleToGo - 360;
  }
  if (prevAngle + angleToGo < -360) {
    return prevAngle + angleToGo + 360;
  }
  return prevAngle + angleToGo;
};

export default moveServo;
