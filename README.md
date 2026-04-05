# Ripcord Discord Bot

A minimal Discord bot setup using Node.js with message filtering, moderation commands, and server setup utilities.

## Features

- **Message Filtering**: Automatically detects and removes messages with filtered words or offensive language (powered by Ollama AI)
- **Command System**: Simple prefix-based command handler with terminal support
- **Moderation Tools**: Add filtered words with the `!addfilter` command (moderators only)
- **Server Setup**: Automated server configuration with channels and permissions
- **Logging**: File and console logging with timestamps

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your bot token:
   ```bash
   cp .env.example .env
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

Use the `!` prefix in Discord or no prefix in the terminal:

- `!ping` - Responds with "Pong!"
- `!echo <message>` - Echoes back your message
- `!addfilter <word>` - Add a word to the filter list (moderators only)
- `exit` - Exits the bot (terminal only)

## Terminal Interface

The bot provides a terminal interface for testing commands. Type commands without the prefix:

```
ripcord > ping
```

Use `Ctrl+C` to see the exit instructions (use the `!exit` command instead).

## Configuration

Edit `config.js` to customize:

- `logsPath` - Where log files are saved
- `enableConsole` - Enable/disable console output
- `enableFileLogging` - Enable/disable file logging
- `enableFiltering` - Enable/disable message filtering
- `commandPrefix` - Command prefix (default: `!`)
