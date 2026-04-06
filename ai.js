// AI integration module using Ollama for content analysis and user prompts
// Handles all interactions with the local Ollama API server

import { ollamaModel } from './config.js';

// Generic prompt function to send messages to Ollama and get a response
// Parameters:
//   messages - Array of message objects with 'role' (user/assistant) and 'content' fields
//   logger - Logger instance for error logging
//   model - Ollama model to use (default: configured ollamaModel from config.js)
// Returns: Response text from AI model, or null if request fails
async function prompt(messages, logger, model = ollamaModel) {
  try {
    // Send the messages to Ollama's chat API endpoint
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false, // Wait for complete response instead of streaming
      }),
    });

    // Check if request was successful
    if (!response.ok) {
      logger.error(`Ollama request failed: ${response.status}`);
      return null;
    }

    // Extract the AI response text
    const data = await response.json();
    return data.message?.content?.trim() || null;
  } catch (error) {
    // Log network or parsing errors
    logger.error(`Ollama error: ${error.message || error}`);
    return null;
  }
}

// Check if message content contains offensive language using AI moderation
// Parameters:
//   content - The message text to analyze
//   logger - Logger instance for error logging
// Returns: Boolean - true if message contains offensive language, false otherwise
async function checkWithOllama(content, logger) {
  // Create a moderation prompt for the AI
  const messages = [
    {
      role: 'user',
      content: `Determine if this message contains bad, foul, profane, or offensive language. Respond with only "yes" or "no".\n\nMessage: "${content}"\n\nContains bad language:`,
    },
  ];

  // Send prompt to AI and parse response
  const result = await prompt(messages, logger);
  return result?.toLowerCase().includes('yes') || false;
}

// Export functions for use in other modules
export {
  prompt,
  checkWithOllama,
};
