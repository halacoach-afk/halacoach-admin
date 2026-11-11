import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

process.env.NEXT_DEV = '1';

/** Ensure NEXT_PUBLIC_* from .env.local are present before Next compiles client chunks. */
function loadEnvLocal() {
  const filePath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Prefer .env.local for local stack so shell leftovers cannot pin a live API URL.
    if (key.startsWith('NEXT_PUBLIC_') || process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// Pin 3000 so a leftover PORT=3333 from the API shell cannot steal the API port.
const child = spawn('npx', ['next', 'dev', '--turbopack', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', code => process.exit(code ?? 0));
