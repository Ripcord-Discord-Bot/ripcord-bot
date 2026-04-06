// Import filtering configuration and AI functions
import * as config from './config.js';
import { checkWithOllama } from './ai.js';
import { hasRole } from './authentication.js';
import path from 'path';
import { checkDirExistsSync, createDirSync, checkFileExistsSync, createFileSync, readFileSync } from './io.js';

const filteredWordsFile = path.join(config.filteredWordsDir, config.filteredWordsFile);

// Initialize filtered words from file
if (!checkDirExistsSync(config.filteredWordsDir)) {
  createDirSync(config.filteredWordsDir);
}

let filteredWords = [];
if (checkFileExistsSync(filteredWordsFile)) {
  try {
    const data = readFileSync(filteredWordsFile);
    filteredWords = JSON.parse(data);
  } catch (error) {
    console.error('Error loading filtered words:', error);
    filteredWords = [];
  }
} else {
  filteredWords = [];
  createFileSync(filteredWordsFile, JSON.stringify(filteredWords, null, 2));
}

// Add a word to the filter list if it's not already present
function addFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  // Only add if not empty and not already in the list
  if (normalized && !filteredWords.includes(normalized)) {
    filteredWords.push(normalized);
    // Save to file
    try {
      createFileSync(filteredWordsFile, JSON.stringify(filteredWords, null, 2));
    } catch (error) {
      console.error('Error saving filtered words:', error);
    }
    return true;
  }
  return false;
}

// Remove a word from the filter list if it exists
function removeFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  const index = filteredWords.indexOf(normalized);
  if (index === -1) return false;
  filteredWords.splice(index, 1);
  try {
    createFileSync(filteredWordsFile, JSON.stringify(filteredWords, null, 2));
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

// Check a message for filtered content and moderate if necessary
async function checkAndModerate(message, logger) {
  // Skip if filtering is disabled
  if (!config.enableFiltering) return false;
  // Skip if message is not in a guild (e.g., DM)
  if (!message.guild) return false;
  // Skip if sender is a moderator
  if (hasRole(message, config.moderatorRole)) return false;

  // Check message against filtered words and AI analysis
  const hasFilteredWords = containsFilteredWord(message.content);
  const hasOffensiveLanguage = await checkWithOllama(message.content, logger);

  // If message is clean, allow it through
  if (!hasFilteredWords && !hasOffensiveLanguage) return false;

  // Build reason string for logging
  const reasons = [];
  if (hasFilteredWords) reasons.push('filtered');
  if (hasOffensiveLanguage) reasons.push('AI detected');
  const reason = reasons.join(' and ');

  // Delete the message if possible
  if (message.deletable) {
    try {
      await message.delete();
      logger.warn(`Deleted message from ${message.author.tag} (${reason})`);
    } catch (error) {
      logger.error(`Failed to delete message: ${error.message || error}`);
    }
  } else {
    logger.warn(`Message not deleted from ${message.author.tag} (${reason}): ${message.id}`);
  }

  // Send warning DM to user
  try {
    await message.author.send(
      'Your message was removed because it contained restricted words. Please follow the server rules.'
    );
    logger.info(`Sent warning DM to ${message.author.tag}`);
  } catch (error) {
    logger.error(`Unable to warn user ${message.author.tag}: ${error.message || error}`);
  }

  return true;
}

export { checkAndModerate, addFilteredWord, removeFilteredWord, getFilteredWords };
