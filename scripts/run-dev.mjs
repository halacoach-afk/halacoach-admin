import {spawn} from 'node:child_process';

process.env.NEXT_DEV = '1';

// Pin 3000 so a leftover PORT=3333 from the API shell cannot steal the API port.
const child = spawn('npx', ['next', 'dev', '--turbopack', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', code => process.exit(code ?? 0));
