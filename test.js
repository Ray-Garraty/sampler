import { spawn } from 'child_process';

const pythonProcess = spawn('python', ['./hardware/st3215/python/servo.py']);

pythonProcess.stdin.write('hello from node');
pythonProcess.stdin.end();

pythonProcess.stdout.on('data', (data) => {
  console.log(`Python output: ${data.toString()}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`Python error: ${data.toString()}`);
});

pythonProcess.on('close', (code) => {
  console.log(`Python process exited with code ${code}`);
});
