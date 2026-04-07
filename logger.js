// File system and path utilities for logging
import * as config from './config.js';
import { clearPrompt, restorePrompt, formatConsoleTag, consoleColors } from './terminal.js';
import { createDir, appendToFile, resolvePath, joinPath } from './io.js';

// Set up log directory for file logging (async)
const logDirectory = resolvePath(config.logsPath);
if (config.enableFileLogging) {
  // Fire and forget, but log error if creation fails
  createDir(logDirectory).catch((err) => {
    if (config.enableConsole) {
      console.error('Failed to create log directory:', err);
    }
  });
}

// Get the path for today's log file (format: YYYY-MM-DD.log)
function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return joinPath(logDirectory, `${date}.log`);
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

// Append a log entry to the current day's log file (async)
async function appendLog(tag, message) {
  if (!config.enableFileLogging) return;
  const timestamp = formatTimestamp(new Date());
  const line = `[${timestamp}] [${tag}] ${message}\n`;
  try {
    await appendToFile(getLogFilePath(), line);
  } catch (err) {
    if (config.enableConsole) {
      console.error('Failed to write log file:', err);
    }
  }
}


// Logger object with async methods for different log levels
const logger = {
  // Log info level message (green) - to console and file
  info: async (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.log(`${formatConsoleTag('INFO', consoleColors.green)} ${message}`);
      restorePrompt();
    }
    await appendLog('INFO', message);
  },
  // Log warning level message (yellow) - to console and file
  warn: async (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.warn(`${formatConsoleTag('WARN', consoleColors.yellow)} ${message}`);
      restorePrompt();
    }
    await appendLog('WARN', message);
  },
  // Log error level message (red) - to console and file
  error: async (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.error(`${formatConsoleTag('ERROR', consoleColors.red)} ${message}`);
      restorePrompt();
    }
    await appendLog('ERROR', message);
  },
};

// Export logger as default export
export default logger;
