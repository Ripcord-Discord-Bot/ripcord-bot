// Launcher — starts the bot and respawns it if it exits with the restart code

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const RESTART_CODE = 100;
const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = join(__dirname, 'bot.js');

function launch() {
  const child = spawn(process.execPath, [...process.execArgv, entry], {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });

  child.on('close', (code) => {
    if (code === RESTART_CODE) {
      console.log('Restarting...');
      launch();
    } else {
      process.exit(code ?? 0);
    }
  });
}

launch();
