import { enableFiltering } from './config.js';
let filteredWords = ['badword', 'spam', 'forbidden'];

function addFilteredWord(word) {
  const normalized = word.toLowerCase().trim();
  if (normalized && !filteredWords.includes(normalized)) {
    filteredWords.push(normalized);
    return true;
  }
  return false;
}

function getFilteredWords() {
  return [...filteredWords];
}

function containsFilteredWord(content) {
  const text = content.toLowerCase();
  return filteredWords.some((word) => text.includes(word));
}

async function checkWithOllama(content, logger) {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: `Determine if this message contains bad, foul, profane, or offensive language. Respond with only "yes" or "no".\n\nMessage: "${content}"\n\nContains bad language:`,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      logger.error(`Ollama request failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const result = data.message?.content?.toLowerCase().trim();
    return result?.includes('yes') || false;
  } catch (error) {
    logger.error(`Ollama error: ${error.message || error}`);
    return false;
  }
}

async function checkAndModerate(message, logger) {
  if (!enableFiltering) return false;
  if (!message.guild) return false;

  const hasFilteredWords = containsFilteredWord(message.content);
  const hasOffensiveLanguage = await checkWithOllama(message.content, logger);

  if (!hasFilteredWords && !hasOffensiveLanguage) return false;

  // Build reason string
  const reasons = [];
  if (hasFilteredWords) reasons.push('filtered');
  if (hasOffensiveLanguage) reasons.push('AI detected');
  const reason = reasons.join(' and ');

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

export default {
  checkAndModerate,
  checkWithOllama,
  addFilteredWord,
  getFilteredWords,
};

export { addFilteredWord, getFilteredWords };
