// File system and path utilities for logging
import fs from 'fs';
import path from 'path';
import * as config from './config.js';
import { clearPrompt, restorePrompt, formatConsoleTag, consoleColors } from './terminal.js';
import { createDirSync, appendToFileSync } from './io.js';

// Set up log directory for file logging
const logDirectory = path.resolve(config.logsPath);
if (config.enableFileLogging) {
  createDirSync(logDirectory);
}

// Get the path for today's log file (format: YYYY-MM-DD.log)
function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logDirectory, `${date}.log`);
}

// Format a date object into DD-MM-YYYY HH:MM:SS format
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

// Append a log entry to the current day's log file
function appendLog(tag, message) {
  if (!config.enableFileLogging) return;
  const timestamp = formatTimestamp(new Date());
  const line = `[${timestamp}] [${tag}] ${message}\n`;
  appendToFileSync(getLogFilePath(), line);
}

// Logger object with methods for different log levels
const logger = {
  // Log info level message (green) - to console and file
  info: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.log(`${formatConsoleTag('INFO', consoleColors.green)} ${message}`);
      restorePrompt();
    }
    appendLog('INFO', message);
  },
  // Log warning level message (yellow) - to console and file
  warn: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.warn(`${formatConsoleTag('WARN', consoleColors.yellow)} ${message}`);
      restorePrompt();
    }
    appendLog('WARN', message);
  },
  // Log error level message (red) - to console and file
  error: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.error(`${formatConsoleTag('ERROR', consoleColors.red)} ${message}`);
      restorePrompt();
    }
    appendLog('ERROR', message);
  },
};

// Export logger as default export
export default logger;
