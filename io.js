// File system utility functions for common I/O operations

import { promises as fsp } from 'fs';
import { join as joinPath, resolve as resolvePath, sep } from 'path';

const cwd = resolvePath(process.cwd());

function validatePath(inputPath) {
  const resolved = resolvePath(inputPath);
  if (resolved !== cwd && !resolved.startsWith(cwd + sep)) {
    throw new Error(`Path traversal detected: "${inputPath}"`);
  }
}

async function checkDirExists(dirPath) {
  validatePath(dirPath);
  try {
    return (await fsp.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

async function createDir(dirPath) {
  validatePath(dirPath);
  await fsp.mkdir(dirPath, { recursive: true });
}

async function checkFileExists(filePath) {
  validatePath(filePath);
  try {
    return (await fsp.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function createFile(filePath, content) {
  validatePath(filePath);
  await fsp.writeFile(filePath, content, 'utf8');
}

async function appendToFile(filePath, content) {
  validatePath(filePath);
  await fsp.appendFile(filePath, content, 'utf8');
}

async function readFile(filePath) {
  validatePath(filePath);
  return fsp.readFile(filePath, 'utf8');
}

async function ensureDir(dirPath) {
  if (!await checkDirExists(dirPath)) await createDir(dirPath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath));
}

async function writeJson(filePath, data) {
  await createFile(filePath, JSON.stringify(data, null, 2));
}

async function loadJson(filePath, defaultValue) {
  if (!await checkFileExists(filePath)) return defaultValue;
  return JSON.parse(await readFile(filePath));
}

export { checkDirExists, createDir, checkFileExists, createFile, appendToFile, readFile, ensureDir, readJson, writeJson, loadJson, joinPath, resolvePath };