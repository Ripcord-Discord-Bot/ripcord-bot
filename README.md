# Ripcord Discord Bot

A minimal, modern Discord bot for moderation, filtering, and automation. Powered by Node.js and Ollama AI.

## Features

- **Message Filtering**: Detects and removes filtered words and offensive language (Ollama AI-powered). Moderators are exempt.
- **Command System**: Prefix-based commands with terminal support
- **Banned User List**: Persistent ban list — banned users are kicked on join or immediately when banned
- **Ticket System**: Messages in the `issues` channel are saved as JSON tickets with an AI-suggested moderator action
- **Role Management**: Reaction-based onboarding — users react 👍 to the rules message to receive the `Trusted` role
- **Server Stats**: Tracks total messages and new user joins, persisted to `data/server-stats.json`
- **Server Setup**: Automated channel/role creation and permissions
- **Logging**: File and console logging with timestamps, including role changes and member events

## Installation

Make sure you have Ollama installed.

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

- Delete all existing channels and messages (clean slate)
- Create roles: `Moderator`, `Trusted`
- Create channels: `welcome`, `chat`, `moderators`, `issues`
- Set permissions (only Trusted/Moderators can post in `chat`, `moderators` is private)
- Post a welcome message and server rules in `welcome`

## Cleanup

Remove all messages and channels (except welcome):

```bash
npm run cleanup
```

## Commands

Use the `!` prefix in Discord, or no prefix in the terminal.

| Command                | Description                            | Usage Example            | Permission      |
| ---------------------- | -------------------------------------- | ------------------------ | --------------- |
| `!ping`                | Responds with "Pong!"                  | `!ping`                  |                 |
| `!echo <message>`      | Echoes back your message               | `!echo Hello world!`     |                 |
| `!ask <question>`      | Asks the AI a question                 | `!ask What is Node.js?`  | Requires Ollama |
| `!addfilter <word>`    | Adds a word to the filter list         | `!addfilter spamword`    | Moderators only |
| `!removefilter <word>` | Removes a word from the filter list    | `!removefilter spamword` | Moderators only |
| `!ban <userId>`        | Adds a user ID to the banned list      | `!ban 123456789`         | Moderators only |
| `!unban <userId>`      | Removes a user ID from the banned list | `!unban 123456789`       | Moderators only |
| `exit`                 | Shuts down the bot                     | `exit`                   | Terminal only   |

**Note:** In the terminal, commands do not require the `!` prefix.

## Terminal Interface

The bot provides a terminal interface for running commands at runtime:

```
ripcord > addfilter badword
ripcord > ban 214898255698460673
ripcord > exit
```

## Onboarding Flow

1. New member joins → receives a DM directing them to `#welcome`
2. Member reacts 👍 to the server rules message → awarded the `Trusted` role
3. With the `Trusted` role, the member can post in `#chat`

## Configuration

All configuration is environment-based. Edit your `.env` file:

| Variable                | Description                         | Default                |
| ----------------------- | ----------------------------------- | ---------------------- |
| `DISCORD_TOKEN`         | Your Discord bot token              | _(required)_           |
| `COMMAND_PREFIX`        | Command prefix                      | `!`                    |
| `ENABLE_CONSOLE`        | Enable console output               | `true`                 |
| `ENABLE_FILE_LOGGING`   | Enable file logging                 | `true`                 |
| `LOGS_PATH`             | Log file directory                  | `logs`                 |
| `ENABLE_FILTERING`      | Enable message filtering            | `true`                 |
| `FILTERED_WORDS_DIR`    | Directory for filtered words file   | `data`                 |
| `FILTERED_WORDS_FILE`   | Filtered words filename             | `filtered-words.json`  |
| `OLLAMA_MODEL`          | Ollama model name                   | `mistral`              |
| `ENABLE_TICKETS`        | Enable ticket system                | `true`                 |
| `TICKET_CHANNEL`        | Channel name for tickets            | `issues`               |
| `TICKET_DIRECTORY_PATH` | Directory for ticket JSON files     | `tickets`              |
| `MODERATOR_CHANNEL`     | Private moderator channel name      | `moderators`           |
| `WELCOME_CHANNEL`       | Welcome/onboarding channel name     | `welcome`              |
| `CHAT_CHANNEL`          | General chat channel name           | `chat`                 |
| `MODERATOR_ROLE`        | Moderator role name                 | `Moderator`            |
| `TRUSTED_ROLE`          | Trusted member role name            | `Trusted`              |
| `SERVER_STATS_PATH`     | Directory for server stats file     | `data`                 |
| `SERVER_STATS_FILE`     | Server stats filename               | `server-stats.json`    |
| `SERVER_RULES_ID_PATH`  | Directory for rules message ID file | `data`                 |
| `SERVER_RULES_ID_FILE`  | Rules message ID filename           | `server-rules-id.json` |
| `BANNED_LIST_PATH`      | Directory for banned list file      | `data`                 |
| `BANNED_LIST_FILE`      | Banned list filename                | `bannedlist.json`      |

##

<p align="center">
   <img src="assets/Ripcord-logo.png" alt="Ripcord Logo" width="120"/>
</p>

---

<p align="center">
   <i>Ripcord is open source and ready for your server!</i>
</p>
