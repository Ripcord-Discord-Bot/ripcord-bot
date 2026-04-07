// AI interface - AI integration using Ollama

import * as config from './config.js';

let ollamaAvailable = true;

// Health check for Ollama server
export async function checkOllamaHealth(logger) {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { method: 'GET' });
    if (!res.ok) throw new Error('Ollama health check failed');
    ollamaAvailable = true;
    return true;
  } catch (error) {
    ollamaAvailable = false;
    if (logger) await logger.error('Ollama server is not available. AI features are disabled.');
    return false;
  }
}

// Returns response text, or null if Ollama is unavailable or the request fails
export async function prompt(messages, logger, model = config.ollamaModel) {
  if (!ollamaAvailable) {
    if (logger) await logger.error('AI features are disabled: Ollama server is not available.');
    return null;
  }
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
      }),
    });
    if (!response.ok) {
      await logger.error(`Ollama request failed: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.message?.content?.trim() || null;
  } catch (error) {
    await logger.error(`Ollama error: ${error.message || error}`);
    return null;
  }
}

export async function suggestTicketAction(ticket, logger) {
  const { author, message, server } = ticket;
  const messages = [
    {
      role: 'user',
      content: `You are a Discord server moderation assistant. A user has submitted a ticket in the issues channel. Based on the ticket details below, suggest a concise course of action for the moderators to take. Be practical and specific.\n\nServer: ${server?.name ?? 'Unknown'}\nUser: ${author.tag} (ID: ${author.id})\nMessage: "${message.content}"\nSubmitted: ${message.createdAt}`,
    },
  ];

  return await prompt(messages, logger);
}

// Returns true if the content contains offensive language, false otherwise
export async function checkWithOllama(content, logger) {
  const messages = [
    {
      role: 'user',
      content: `Determine if this message contains bad, foul, profane, or offensive language. Respond with only "yes" or "no".\n\nMessage: "${content}"`,
    },
  ];

  // Send prompt to AI and parse response
  const result = await prompt(messages, logger);
  return result?.toLowerCase().includes('yes') || false;
}

