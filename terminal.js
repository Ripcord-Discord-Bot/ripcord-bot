// Terminal interface — manages the readline prompt and console output

import readline from 'readline';
import * as config from './config.js';

let promptInterface = null;

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

function clearPrompt() {
  if (!promptInterface || !config.enableConsole) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

function restorePrompt() {
  if (!promptInterface || !config.enableConsole) return;
  promptInterface.prompt(true);
}

// Print to console without disrupting the active readline prompt
function printToConsole(consoleFn, text) {
  if (!config.enableConsole) return;
  clearPrompt();
  consoleFn(text);
  restorePrompt();
}

function terminalOutput(message) {
  printToConsole(console.log, `${formatConsoleTag('TERMINAL', consoleColors.purple)} ${message}`);
}

function setPromptInterface(rl) {
  promptInterface = rl;
}

function shutdown(cleanup) {
  if (typeof cleanup === 'function') {
    Promise.resolve(cleanup()).finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

function setupTerminal(handleInput, logger) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ripcord > ',
    terminal: true,
  });

  setPromptInterface(rl);
  rl.prompt();

  rl.on('line', async (line) => {
    const handled = await handleInput(line, logger);
    if (!handled) {
      await logger.warn(`Command not recognized in terminal input: ${line}`);
    }
    rl.prompt();
  });

  return rl;
}

// Intercept Ctrl+C to prevent abrupt exit and prompt the user to use the exit command
function setupSigintHandler() {
  process.on('SIGINT', () => {
    if (promptInterface && config.enableConsole) {
      clearPrompt();
      console.log(`${formatConsoleTag('TERMINAL', consoleColors.purple)} Use the "exit" command to exit gracefully.`);
      promptInterface.prompt();
    }
  });
}

export {
  setupTerminal,
  setupSigintHandler,
  shutdown,
  terminalOutput,
  printToConsole,
  clearPrompt,
  restorePrompt,
  formatConsoleTag,
  consoleColors,
};
