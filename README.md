# Ripcord Discord Bot

A minimal, modern Discord bot for moderation, filtering, and automation. Powered by Node.js and Ollama AI.

## Features

- <b>Message Filtering</b>: Detects and removes filtered or offensive language (Ollama AI-powered)
- <b>Command System</b>: Prefix-based commands and terminal support
- <b>Moderation Tools</b>: Add filtered words with <code>!addfilter</code> (moderators only), uses AI to auto-moderate
- <b>Server Setup</b>: Automated channel/role creation and permissions
- <b>Logging</b>: File and console logging with timestamps

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your bot token and config:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

## Running the Bot

Start the bot:

```bash
npm run dev
# or
npm start
```

## Server Setup

Initialize your Discord server with channels and roles:

```bash
npm run setup
```

This will:

- Create channels: `welcome`, `chat`, `issues`, `moderators`
- Create a `Moderator` role
- Set appropriate permissions (moderators-only channels)
- Post welcome and rules messages in the `welcome` channel

## Cleanup

Remove all messages and channels (except welcome):

```bash
npm run cleanup
```

This will:

- Delete all messages from all channels
- Delete all text and voice channels except `welcome`
- Preserve the `welcome` channel for re-setup

## Commands

Use the `!` prefix in Discord, or no prefix in the terminal. All commands are available in both Discord and the terminal unless otherwise noted.

| Command             | Description                    | Usage Example         | Notes                      |
| ------------------- | ------------------------------ | --------------------- | -------------------------- |
| `!ping`             | Responds with "Pong!"          | `!ping`               |                            |
| `!echo <message>`   | Echoes back your message       | `!echo Hello world!`  |                            |
| `!addfilter <word>` | Adds a word to the filter list | `!addfilter spamword` | Moderators only            |
| `!ask <question>`   | Asks the AI a question         | `!ask What is AI?`    | Requires Ollama/AI enabled |
| `exit`              | Exits the bot (terminal only)  | `exit`                | Terminal only              |

**Note:** In the terminal, commands do not require the `!` prefix.

## Terminal Interface

The bot provides a terminal interface for testing commands. Type commands without the prefix:

```
ripcord > ping
```

## Configuration

All configuration is now environment-based. Edit your `.env` file:

- `DISCORD_TOKEN` - Your Discord bot token
- `COMMAND_PREFIX` - Command prefix (default: `!`)
- `ENABLE_CONSOLE` - Enable/disable console output (true/false)
- `ENABLE_FILE_LOGGING` - Enable/disable file logging (true/false)
- `LOGS_PATH` - Log file directory (default: logs)
- `ENABLE_FILTERING` - Enable/disable message filtering (true/false)
- `FILTERED_WORDS_DIR` - Directory for filtered words (default: data)
- `OLLAMA_MODEL` - Ollama model name (default: mistral)
- `ENABLE_TICKETS` - Enable/disable ticket system (true/false)
- `TICKET_DIRECTORY_PATH` - Directory for tickets (default: tickets)

##

<p align="center">
   <img src="assets/Ripcord-logo.png" alt="Ripcord Logo" width="120"/>
</p>

---

<p align="center">
   <i>Ripcord is open source and ready for your server!</i>
</p>
