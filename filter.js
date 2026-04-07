// Import filtering configuration and AI functions
import * as config from './config.js';
import { checkWithOllama } from './ai.js';
import { hasRole } from './authentication.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';

const filteredWordsFile = joinPath(config.filteredWordsDir, config.filteredWordsFile);

let filteredWords = [];

async function initFilter() {
  await ensureDir(config.filteredWordsDir);
  filteredWords = await loadJson(filteredWordsFile, []);
}

// Add a word to the filter list if it's not already present
async function addFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  // Only add if not empty and not already in the list
  if (normalized && !filteredWords.includes(normalized)) {
    filteredWords.push(normalized);
    // Save to file
    try {
      await writeJson(filteredWordsFile, filteredWords);
    } catch (error) {
      console.error('Error saving filtered words:', error);
    }
    return true;
  }
  return false;
}

// Remove a word from the filter list if it exists
async function removeFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  const index = filteredWords.indexOf(normalized);
  if (index === -1) return false;
  filteredWords.splice(index, 1);
  try {
    await writeJson(filteredWordsFile, filteredWords);
  } catch (error) {
    console.error('Error saving filtered words:', error);
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
async function deleteAndWarn(message, reason, logger) {
  if (message.deletable) {
    try {
      await message.delete();
      await logger.warn(`Deleted message from ${message.author.tag} (${reason})`);
    } catch (error) {
      await logger.error(`Failed to delete message: ${error.message || error}`);
    }
  } else {
    await logger.warn(`Message not deleted from ${message.author.tag} (${reason}): ${message.id}`);
  }

  try {
    await message.author.send(
      'Your message was removed because it contained restricted content. Please follow the server rules.'
    );
    await logger.info(`Sent warning DM to ${message.author.tag}`);
  } catch (error) {
    await logger.error(`Unable to warn user ${message.author.tag}: ${error.message || error}`);
  }
}

// Run AI check in the background without blocking the message pipeline
function moderateWithAI(message, logger) {
  checkWithOllama(message.content, logger)
    .then(async (flagged) => {
      if (flagged) await deleteAndWarn(message, 'AI detected', logger);
    })
    .catch(async (error) => {
      await logger.error(`Background AI moderation error: ${error.message || error}`);
    });
}

// Check a message for filtered content and moderate if necessary
async function checkAndModerate(message, logger) {
  // Skip if filtering is disabled
  if (!config.enableFiltering) return false;
  // Skip if message is not in a guild (e.g., DM)
  if (!message.guild) return false;
  // Skip if sender is a moderator
  if (hasRole(message, config.moderatorRole)) return false;

  // Word list check is instant — act immediately if matched
  if (containsFilteredWord(message.content)) {
    await deleteAndWarn(message, 'filtered', logger);
    return true;
  }

  // AI check is slow — run without blocking the message pipeline
  moderateWithAI(message, logger);
  return false;
}

export { initFilter, checkAndModerate, addFilteredWord, removeFilteredWord, getFilteredWords };
