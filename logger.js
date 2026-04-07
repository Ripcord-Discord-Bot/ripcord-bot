// Logger — writes timestamped messages to console and log files

import * as config from './config.js';
import { printToConsole, formatConsoleTag, consoleColors } from './terminal.js';
import { createDir, appendToFile, resolvePath, joinPath } from './io.js';

const logDirectory = resolvePath(config.logsPath);
if (config.enableFileLogging) {
  createDir(logDirectory).catch((err) => {
    if (config.enableConsole) console.error('Failed to create log directory:', err);
  });
}

function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return joinPath(logDirectory, `${date}.log`);
}

// Returns timestamp in DD-MM-YYYY HH:MM:SS format
function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

async function appendLog(tag, message) {
  if (!config.enableFileLogging) return;
  const timestamp = formatTimestamp(new Date());
  // Strip ANSI color codes before writing to file
  const clean = message.replace(/\x1b\[[0-9;]*m/g, '');
  const line = `[${timestamp}] [${tag}] ${clean}\n`;
  try {
    await appendToFile(getLogFilePath(), line);
  } catch (err) {
    if (config.enableConsole) console.error('Failed to write log file:', err);
  }
}

const logger = {
  info: async (message) => {
    printToConsole(console.log, `${formatConsoleTag('INFO', consoleColors.green)} ${message}`);
    await appendLog('INFO', message);
  },
  warn: async (message) => {
    printToConsole(console.warn, `${formatConsoleTag('WARN', consoleColors.yellow)} ${message}`);
    await appendLog('WARN', message);
  },
  error: async (message) => {
    printToConsole(console.error, `${formatConsoleTag('ERROR', consoleColors.red)} ${message}`);
    await appendLog('ERROR', message);
  },
};

export default logger;
