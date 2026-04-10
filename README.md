# Ripcord Discord Bot

A modular, modern Discord bot for server management, moderation, scheduling, and automation. Powered by Node.js and Ollama AI.

## Features

- **Message Filtering** — detects and removes filtered words. Moderators are exempt.
- **Banned User List** — persistent ban list; banned users are kicked immediately or on join.
- **Ticket System** — messages in the `issues` channel are saved as JSON tickets with an AI-suggested moderator action.
- **Role Management** — reaction-based onboarding; users react 👍 to the rules message to receive the `Trusted` role.
- **Scheduler** — run channel messages on interval (`30s`, `5m`, `2h`, `1d`, `1w`) or cron schedules.
- **Server Stats** — tracks messages, commands, filtered messages, tickets, bans, user joins/leaves, tasks run, and role counts. Snapshots daily.
- **Web Panel** — browser-based panel for managing config, schedules, filters, bans, tickets, logs, and stats.
- **Terminal Interface** — interactive prompt for running commands at runtime.
- **AI Integration** — optional Ollama-powered `!ask` command and ticket action suggestions.
- **Audit Logging** — logs message edits/deletes, member joins/leaves, role changes, bans, voice events, and more.
- **Auto-Restart** — changing config via the panel automatically restarts the bot.
- **Server Setup** — automated channel/role creation and permission configuration.

## Requirements

- [Node.js](https://nodejs.org/) >= 18.0.0
- [Ollama](https://ollama.com/) (optional — required for AI features)

## Installation

1. Install dependencies:

   ```bash
   npm install
   cd panel && npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DISCORD_TOKEN`.

## Running the Bot

```bash
npm start
# or for development
npm run dev
```

Both commands use `launcher.js`, which automatically respawns the bot when it exits with the restart signal (e.g. after a config change from the panel).

## Running the Panel

```bash
cd panel
npm run dev
```

The panel runs at `http://localhost:5173` by default and connects to the bot's API on port `3001`.

## Server Setup

Initialize your Discord server with channels, roles, and permissions:

```bash
npm run setup
```

This will:

- Clean up all existing channels, roles, and messages
- Create roles: `Moderator`, `Trusted`
- Create channels: `welcome`, `chat`, `moderators`, `issues`
- Set permissions (only Trusted/Moderators can post in `#chat`; `#moderators` is private)
- Post a welcome message and server rules with a 👍 reaction prompt

## Cleanup

Remove all messages, channels, and roles (except the welcome channel):

```bash
npm run cleanup
```

## Tests

```bash
npm test
npm run test-snapshot
```

## Commands

Use the `!` prefix in Discord or no prefix in the terminal.

### General

| Command           | Description                | Permission      |
| ----------------- | -------------------------- | --------------- |
| `!ping`           | Responds with Pong!        |                 |
| `!echo <text>`    | Echoes back text           |                 |
| `!ask <question>` | Asks the AI a question     | Requires Ollama |
| `!help`           | Lists available commands   |                 |
| `!stats`          | Displays server statistics | Moderators only |

### Moderation

| Command                | Description                               | Permission      |
| ---------------------- | ----------------------------------------- | --------------- |
| `!addfilter <word>`    | Adds a word to the filter list            | Moderators only |
| `!removefilter <word>` | Removes a word from the filter list       | Moderators only |
| `!ban <userId> [...]`  | Adds one or more users to the banned list | Moderators only |
| `!unban <userId>`      | Removes a user from the banned list       | Moderators only |

### Scheduler

| Command                                                         | Description               | Permission      |
| --------------------------------------------------------------- | ------------------------- | --------------- |
| `!schedule list`                                                | Lists all scheduled tasks | Moderators only |
| `!schedule add <id> interval <duration> <channel> <message>`    | Adds an interval task     | Moderators only |
| `!schedule add <id> cron <m h dom mon dow> <channel> <message>` | Adds a cron task          | Moderators only |
| `!schedule remove <id>`                                         | Removes a task            | Moderators only |
| `!schedule enable <id>`                                         | Enables a task            | Moderators only |
| `!schedule disable <id>`                                        | Disables a task           | Moderators only |
| `!schedule run <id>`                                            | Runs a task immediately   | Moderators only |

Duration examples: `30s`, `5m`, `2h`, `1d`, `1w`  
Cron example: `0 9 * * 1` (every Monday at 09:00)

### Terminal Only

| Command   | Description        |
| --------- | ------------------ |
| `exit`    | Shuts down the bot |
| `restart` | Restarts the bot   |

## Terminal Interface

```
ripcord > addfilter badword
ripcord > ban 214898255698460673
ripcord > schedule list
ripcord > restart
```

## Onboarding Flow

1. New member joins the server
2. Member reads rules in `#welcome` and reacts 👍
3. Bot awards the `Trusted` role
4. Member can now post in `#chat`

## Configuration

All configuration is environment-based. Edit `.env`:

| Variable                | Description                          | Default                 |
| ----------------------- | ------------------------------------ | ----------------------- |
| `DISCORD_TOKEN`         | Your Discord bot token               | _(required)_            |
| `COMMAND_PREFIX`        | Command prefix                       | `!`                     |
| `ENABLE_CONSOLE`        | Enable console output                | `true`                  |
| `ENABLE_FILE_LOGGING`   | Enable file logging                  | `true`                  |
| `LOGS_PATH`             | Log file directory                   | `logs`                  |
| `ENABLE_FILTERING`      | Enable message filtering             | `true`                  |
| `FILTERED_WORDS_DIR`    | Directory for filtered words file    | `data`                  |
| `FILTERED_WORDS_FILE`   | Filtered words filename              | `filtered-words.json`   |
| `OLLAMA_MODEL`          | Ollama model name                    | `mistral`               |
| `ENABLE_TICKETS`        | Enable ticket system                 | `true`                  |
| `TICKET_CHANNEL`        | Channel name for tickets             | `issues`                |
| `TICKET_DIRECTORY_PATH` | Directory for ticket JSON files      | `tickets`               |
| `CHAT_CHANNEL`          | General chat channel name            | `chat`                  |
| `MODERATOR_CHANNEL`     | Private moderator channel name       | `moderators`            |
| `WELCOME_CHANNEL`       | Welcome/onboarding channel name      | `welcome`               |
| `MODERATOR_ROLE`        | Moderator role name                  | `Moderator`             |
| `TRUSTED_ROLE`          | Trusted member role name             | `Trusted`               |
| `SERVER_STATS_PATH`     | Directory for server stats file      | `data`                  |
| `SERVER_STATS_FILE`     | Server stats filename                | `server-stats.json`     |
| `SERVER_RULES_ID_PATH`  | Directory for rules message ID file  | `data`                  |
| `SERVER_RULES_ID_FILE`  | Rules message ID filename            | `server-rules-id.json`  |
| `BANNED_LIST_PATH`      | Directory for banned list file       | `data`                  |
| `BANNED_LIST_FILE`      | Banned list filename                 | `bannedlist.json`       |
| `SCHEDULES_PATH`        | Directory for schedules file         | `data`                  |
| `SCHEDULES_FILE`        | Schedules filename                   | `schedules.json`        |
| `API_PORT`              | Port for the bot's HTTP API          | `3001`                  |
| `API_TOKEN`             | Bearer token for API auth (optional) |                         |
| `PANEL_ORIGIN`          | Allowed CORS origin for the panel    | `http://localhost:5173` |

##

<p align="center">
   <img src="assets/Ripcord-logo.png" alt="Ripcord Logo" width="120"/>
</p>

---

<p align="center">
   <i>Ripcord is open source and ready for your server!</i>
</p>
