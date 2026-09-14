import {spawn} from 'node:child_process';

process.env.NEXT_DEV = '1';

const child = spawn('npx', ['next', 'dev', '--turbopack'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', code => process.exit(code ?? 0));
