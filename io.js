// File system utility functions for common I/O operations
// Provides async wrappers around Node.js fs operations

import fs from 'fs';
import path from 'path';

// Check if a directory exists
// Parameters:
//   dirPath - Absolute path to the directory
// Returns: Promise<boolean> - true if directory exists, false otherwise
async function checkDirExists(dirPath) {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

// Create a directory (recursively if needed)
// Parameters:
//   dirPath - Absolute path to the directory to create
// Returns: Promise<void>
async function createDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

// Check if a file exists
// Parameters:
//   filePath - Absolute path to the file
// Returns: Promise<boolean> - true if file exists, false otherwise
async function checkFileExists(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

// Create a new file with content (overwrites if exists)
// Parameters:
//   filePath - Absolute path to the file
//   content - Content to write to the file
// Returns: Promise<void>
async function createFile(filePath, content) {
  await fs.promises.writeFile(filePath, content, 'utf8');
}

// Append content to an existing file (creates if doesn't exist)
// Parameters:
//   filePath - Absolute path to the file
//   content - Content to append to the file
// Returns: Promise<void>
async function appendToFile(filePath, content) {
  await fs.promises.appendFile(filePath, content, 'utf8');
}

// Synchronous versions for compatibility

// Check if a directory exists (sync)
// Parameters:
//   dirPath - Absolute path to the directory
// Returns: boolean - true if directory exists, false otherwise
function checkDirExistsSync(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

// Create a directory (recursively if needed, sync)
// Parameters:
//   dirPath - Absolute path to the directory to create
// Returns: void
function createDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Check if a file exists (sync)
// Parameters:
//   filePath - Absolute path to the file
// Returns: boolean - true if file exists, false otherwise
function checkFileExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

// Create a new file with content (overwrites if exists, sync)
// Parameters:
//   filePath - Absolute path to the file
//   content - Content to write to the file
// Returns: void
function createFileSync(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// Append content to an existing file (creates if doesn't exist, sync)
// Parameters:
//   filePath - Absolute path to the file
//   content - Content to append to the file
// Returns: void
function appendToFileSync(filePath, content) {
  fs.appendFileSync(filePath, content, 'utf8');
}

// Read content from a file (sync)
// Parameters:
//   filePath - Absolute path to the file
// Returns: string - content of the file
function readFileSync(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export {
  checkDirExists,
  createDir,
  checkFileExists,
  createFile,
  appendToFile,
  checkDirExistsSync,
  createDirSync,
  checkFileExistsSync,
  createFileSync,
  appendToFileSync,
  readFileSync,
};