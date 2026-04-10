// Exit — centralizes graceful shutdown logic for all exit paths

import { stopApi } from './api.js';
import { stopScheduler } from './scheduler.js';
import { closeTerminal } from './terminal.js';

const RESTART_CODE = 100;

let _logger = null;
let _shuttingDown = false;

export function setupExit(logger) {
  _logger = logger;

  // Intercept Ctrl+C — shut down gracefully
  process.on('SIGINT', () => shutdown('SIGINT received'));

  // Graceful shutdown on SIGTERM (Docker, systemd, kill)
  process.on('SIGTERM', () => shutdown('SIGTERM received'));

  // Log and exit on unhandled errors
  process.on('uncaughtException', async (err) => {
    if (_logger) await _logger.error(`Uncaught exception: ${err.message || err}`);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    if (_logger) await _logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  });
}

// Gracefully stop all services and exit with the given code
export async function shutdown(reason, code = 0) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  if (_logger) await _logger.info(`Shutting down: ${reason}`);
  closeTerminal();
  stopScheduler();
  await stopApi(_logger);
  process.exit(code);
}

// Tear down services and exit with the restart code — launcher.js will respawn
export async function restart(reason) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  if (_logger) await _logger.info(`Restarting: ${reason}`);
  closeTerminal();
  stopScheduler();
  await stopApi(_logger);
  process.exit(RESTART_CODE);
}
