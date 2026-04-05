import fs from 'fs';
import path from 'path';
import readline from 'readline';
import * as config from './config.js';

const logDirectory = path.resolve(config.logsPath);
if (config.enableFileLogging) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

let promptInterface = null;

function clearPrompt() {
  if (!promptInterface || !config.enableConsole) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

function restorePrompt() {
  if (!promptInterface || !config.enableConsole) return;
  promptInterface.prompt(true);
}

function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logDirectory, `${date}.log`);
}

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

function appendLog(tag, message) {
  if (!config.enableFileLogging) return;
  const timestamp = formatTimestamp(new Date());
  const line = `[${timestamp}] [${tag}] ${message}\n`;
  fs.appendFileSync(getLogFilePath(), line, 'utf8');
}

const consoleColors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  purple: '\x1b[35m',
};

function formatConsoleTag(label, levelColor) {
  return `${consoleColors.cyan}[${levelColor}${label}${consoleColors.cyan}]${consoleColors.reset}`;
}

const logger = {
  setPromptInterface: (rl) => {
    if (config.enableConsole) {
      promptInterface = rl;
    }
  },
  terminalOutput: (message) => {
    if (!config.enableConsole) return;
    clearPrompt();
    console.log(`${formatConsoleTag('TERMINAL', consoleColors.purple)} ${message}`);
    restorePrompt();
  },
  info: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.log(`${formatConsoleTag('INFO', consoleColors.green)} ${message}`);
      restorePrompt();
    }
    appendLog('INFO', message);
  },
  warn: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.warn(`${formatConsoleTag('WARN', consoleColors.yellow)} ${message}`);
      restorePrompt();
    }
    appendLog('WARN', message);
  },
  error: (message) => {
    if (config.enableConsole) {
      clearPrompt();
      console.error(`${formatConsoleTag('ERROR', consoleColors.red)} ${message}`);
      restorePrompt();
    }
    appendLog('ERROR', message);
  },
};

export default logger;
