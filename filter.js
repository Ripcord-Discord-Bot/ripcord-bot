// Word filter — manages the filtered word list and moderates messages

import * as config from './config.js';
import { checkWithOllama } from './ai.js';
import { hasRole } from './authentication.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';
import { recordFilteredMessage } from './serverstats.js';

const filteredWordsFile = joinPath(config.filteredWordsDir, config.filteredWordsFile);

let _logger = null;
let filteredWords = [];

async function initFilter(logger = null) {
  _logger = logger;
  await ensureDir(config.filteredWordsDir);
  filteredWords = await loadJson(filteredWordsFile, []);
}

async function addFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  if (normalized && !filteredWords.includes(normalized)) {
    filteredWords.push(normalized);
    try {
      await writeJson(filteredWordsFile, filteredWords);
    } catch (error) {
      if (_logger) await _logger.error(`Failed to save filtered words: ${error.message || error}`);
    }
    return true;
  }
  return false;
}

async function removeFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  const index = filteredWords.indexOf(normalized);
  if (index === -1) return false;
  filteredWords.splice(index, 1);
  try {
    await writeJson(filteredWordsFile, filteredWords);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save filtered words: ${error.message || error}`);
  }
  return true;
}

// Get a copy of the current filtered words list
function getFilteredWords() {
  return [...filteredWords];
}

// Check if message content contains any filtered words
function containsFilteredWord(content) {
  const text = content.toLowerCase();
  return filteredWords.some((word) => text.includes(word));
}

// Delete a message and send a warning DM to the author
async function deleteAndWarn(message, reason) {
  await recordFilteredMessage();
  if (message.deletable) {
    try {
      await message.delete();
      if (_logger) await _logger.warn(`Deleted message from ${message.author.tag} (${reason})`);
    } catch (error) {
      if (_logger) await _logger.error(`Failed to delete message: ${error.message || error}`);
    }
  } else {
    if (_logger) await _logger.warn(`Message not deleted from ${message.author.tag} (${reason}): ${message.id}`);
  }

  try {
    await message.author.send(
      'Your message was removed because it contained restricted content. Please follow the server rules.'
    );
    if (_logger) await _logger.info(`Sent warning DM to ${message.author.tag}`);
  } catch (error) {
    if (_logger) await _logger.error(`Unable to warn user ${message.author.tag}: ${error.message || error}`);
  }
}

// Run AI check in the background without blocking the message pipeline
function moderateWithAI(message) {
  checkWithOllama(message.content, _logger)
    .then(async (flagged) => {
      if (flagged) await deleteAndWarn(message, 'AI detected');
    })
    .catch(async (error) => {
      if (_logger) await _logger.error(`Background AI moderation error: ${error.message || error}`);
    });
}

// Check a message for filtered content and moderate if necessary
async function checkAndModerate(message) {
  // Skip if filtering is disabled
  if (!config.enableFiltering) return false;
  // Skip if message is not in a guild (e.g., DM)
  if (!message.guild) return false;
  // Skip if sender is a moderator
  if (hasRole(message, config.moderatorRole)) return false;

  // Word list check is instant — act immediately if matched
  if (containsFilteredWord(message.content)) {
    await deleteAndWarn(message, 'filtered');
    return true;
  }

  // AI check is slow — run without blocking the message pipeline
  moderateWithAI(message);
  return false;
}

export { initFilter, checkAndModerate, addFilteredWord, removeFilteredWord, getFilteredWords };
