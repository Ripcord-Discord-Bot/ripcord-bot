import { enableFiltering } from './config.js';
const filteredWords = ['badword', 'spam', 'forbidden'];

function containsFilteredWord(content) {
  const text = content.toLowerCase();
  return filteredWords.some((word) => text.includes(word));
}

async function checkAndModerate(message, logger) {
  if (!enableFiltering) return false;
  if (!message.guild) return false;
  if (!containsFilteredWord(message.content)) return false;

  if (message.deletable) {
    try {
      await message.delete();
      logger.warn(`Deleted filtered message from ${message.author.tag}`);
    } catch (error) {
      logger.error(`Failed to delete message: ${error.message || error}`);
    }
  } else {
    logger.warn(`Message contained filtered words but could not be deleted: ${message.id}`);
  }

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

async function addFilteredWord(word) {
  const normalized = word.toLowerCase();
  if (!filteredWords.includes(normalized)) {
    filteredWords.push(normalized);
  }
}

async function removeFilteredWord(word) {
  const normalized = word.toLowerCase();
  const index = filteredWords.indexOf(normalized);
  if (index !== -1) {
    filteredWords.splice(index, 1);
  }
}


export default {
  checkAndModerate,
  filteredWords,
};
