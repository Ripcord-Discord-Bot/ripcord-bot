// Terminal interface management for the Discord bot
// Handles readline setup, terminal input processing, and terminal output

import readline from 'readline';
import * as config from './config.js';

// Store reference to the readline interface for terminal management
let promptInterface = null;

// ANSI color codes for console output
const consoleColors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  purple: '\x1b[35m',
};

// Format a log tag with ANSI color codes
function formatConsoleTag(label, levelColor) {
  return `${consoleColors.cyan}[${levelColor}${label}${consoleColors.cyan}]${consoleColors.reset}`;
}

// Clear the current line in the terminal prompt
function clearPrompt() {
  if (!promptInterface || !config.enableConsole) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

// Restore the terminal prompt after clearing it
function restorePrompt() {
  if (!promptInterface || !config.enableConsole) return;
  promptInterface.prompt(true);
}

// Log a message to the terminal without interfering with the prompt
function terminalOutput(message) {
  if (!config.enableConsole) return;
  clearPrompt();
  console.log(`${formatConsoleTag('TERMINAL', consoleColors.purple)} ${message}`);
  restorePrompt();
}

// Store the prompt interface for use by other modules
function setPromptInterface(rl) {
  promptInterface = rl;
}

// Get the prompt interface
function getPromptInterface() {
  return promptInterface;
}

// Clean exit function
function shutdown() {
  process.exit(0);
}

// Initialize terminal interface for executing commands
// Parameters:
//   handleInput - Function to process terminal input (from commands module)
//   logger - Logger instance for terminal output
// Returns: Readline interface
function setupTerminal(handleInput, logger) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ripcord > ',
  });

  // Store the readline interface for prompt management
  setPromptInterface(rl);
  rl.prompt();

  // Process each line of terminal input as a command
  rl.on('line', async (line) => {
    const handled = await handleInput(line, logger);
    if (!handled) {
      await logger.warn(`Command not recognized in terminal input: ${line}`);
    }
    rl.prompt();
  });

  return rl;
}

// Handle Ctrl+C gracefully by prompting to use exit command
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
  setPromptInterface,
  getPromptInterface,
  clearPrompt,
  restorePrompt,
  formatConsoleTag,
  consoleColors,
};
