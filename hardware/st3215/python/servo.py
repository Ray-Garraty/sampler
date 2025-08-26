import sys
from st3215 import ST3215

reqFromMain = sys.stdin.read().strip().split(",")
portPath = reqFromMain[0]
reqAngle = int(reqFromMain[1])

servo = ST3215(portPath)
servoId = 1

if servo.PingServo(servoId):
	servo.SetMode(servoId, 0)
	positionToShift = round(reqAngle * 4094 / 360)
	servo.MoveTo(servoId, positionToShift, 300, 50, True)
	finalPos = round(servo.ReadPosition(servoId) * 360 / 4094)
	print(finalPos)
else:
	raise ExceptionType("Servo Ping Failed")