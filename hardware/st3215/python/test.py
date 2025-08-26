from st3215 import ST3215

servo = ST3215('/dev/ttyUSB0')
servoId = 1

print(servo.PingServo(servoId))
