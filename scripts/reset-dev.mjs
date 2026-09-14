import {rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {join} from 'node:path';

const root = join(import.meta.dirname, '..');

for (const dir of ['.next', '.next-dev', '.next-build']) {
  try {
    rmSync(join(root, dir), {recursive: true, force: true});
    console.log(`removed ${dir}`);
  } catch {
    // ignore
  }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npm, ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', code => process.exit(code ?? 0));
