// Server statistics — tracks and persists message and new user counts

import * as config from './config.js';
import { ensureDir, checkFileExists, readJson, writeJson, loadJson, joinPath, readDir } from './io.js';
import { renameCategoryById, findCategory, getGuildMemberCount } from './interactions.js';

const statsFilePath = joinPath(config.serverStatsPath, config.serverStatsFile);

let _logger = null;
let _dirty = false;

let stats = {
  messages: 0,
  newUsers: 0,
  commandsRun: 0,
  filteredMessages: 0,
  ticketsCreated: 0,
  ticketsResolved: 0,
  bannedUsersKicked: 0,
  usersLeft: 0,
  tasksRun: 0,
  memberCount: 0,
  roleCounts: {},
};

// Ensure the data directory and stats file exist, loading existing stats if present
export async function setupServerStats(client, logger) {
  _logger = logger;
  try {
    await ensureDir(config.serverStatsPath);

    if (await checkFileExists(statsFilePath)) {
      const loaded = await readJson(statsFilePath);
      stats = { ...stats, ...loaded };
      if (_logger) await _logger.info('Loaded server stats from file');
    } else {
      await writeJson(statsFilePath, stats);
      if (_logger) await _logger.info('Initialized new server stats file');
    }
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load server stats: ${error.message || error}`);
  }

  const guild = client.guilds.cache.first();
  if (guild) await seedGuildStats(guild);
}

async function saveServerStats() {
  if (!_dirty) return;
  try {
    await writeJson(statsFilePath, stats);
    _dirty = false;
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save server stats: ${error.message || error}`);
  }
}

export async function recordMessage() {
  stats.messages += 1;
  _dirty = true;
}

export async function recordNewUser() {
  stats.newUsers += 1;
  _dirty = true;
}

export async function recordCommandRun() {
  stats.commandsRun += 1;
  _dirty = true;
}

export async function recordFilteredMessage() {
  stats.filteredMessages += 1;
  _dirty = true;
}

export async function recordTicketCreated() {
  stats.ticketsCreated += 1;
  _dirty = true;
}

export async function recordTicketResolved() {
  stats.ticketsResolved += 1;
  _dirty = true;
}

export async function recordKickedUser() {
  stats.bannedUsersKicked += 1;
  _dirty = true;
}

export async function recordUserLeft() {
  stats.usersLeft += 1;
  _dirty = true;
}

export async function recordTaskRun() {
  stats.tasksRun += 1;
  _dirty = true;
}

// Replace the full role counts map (called on bot ready from live guild data)
export async function setRoleCounts(counts) {
  stats.roleCounts = { ...counts };
  _dirty = true;
}

// Set the current guild member count (called on bot ready and on member join/leave)
export async function setMemberCount(count) {
  stats.memberCount = count;
  _dirty = true;
}

// Increment a single role's count (called when a role is assigned)
export async function recordRoleAssigned(roleName) {
  stats.roleCounts[roleName] = (stats.roleCounts[roleName] || 0) + 1;
  _dirty = true;
}

export function getServerStats() {
  return { ...stats, roleCounts: { ...stats.roleCounts } };
}

export { saveServerStats };

// Write a snapshot of current counters to data/stats-history/<date>.json.
// Writes a snapshot of current counters to data/stats-history/<yesterday>.json.
export async function snapshot() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);
  try {
    const historyDir = joinPath(config.serverStatsPath, 'stats-history');
    await ensureDir(historyDir);
    const filePath = joinPath(historyDir, `${date}.json`);
    await writeJson(filePath, { date, stats: getServerStats() });
    if (_logger) await _logger.info(`Snapshotted stats for ${date}`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to snapshot stats: ${error.message || error}`);
  }
}

export async function getStatsHistory(days = 30) {
  const clamped = Math.min(Math.max(1, days), 365);
  try {
    const historyDir = joinPath(config.serverStatsPath, 'stats-history');
    const files = await readDir(historyDir);
    const snapshots = await Promise.all(
      files
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort()
        .slice(-clamped)
        .map((f) => readJson(joinPath(historyDir, f)))
    );
    return snapshots;
  } catch {
    return [];
  }
}

// Seeds member count and role counts from live guild data on startup.
export async function seedGuildStats(guild) {
  const members = await guild.members.fetch();
  await setMemberCount(guild.memberCount);
  const counts = {};
  for (const member of members.values()) {
    for (const role of member.roles.cache.values()) {
      if (role.name === '@everyone') continue;
      counts[role.name] = (counts[role.name] || 0) + 1;
    }
  }
  await setRoleCounts(counts);
}

// Renames the given category to '<serverTitle> | <memberCount> members'.
// On first call resolves the category by name and persists its Discord ID so
// subsequent renames work even after the name has changed.
export async function updateCategoryTitle(categoryName) {
  const idFilePath = joinPath(config.categoryTitleIdPath, config.categoryTitleIdFile);

  let categoryId = (await loadJson(idFilePath, {})).id ?? null;

  if (!categoryId) {
    const category = findCategory(categoryName);
    if (!category) {
      if (_logger) await _logger.warn(`updateCategoryTitle: category "${categoryName}" not found`);
      return;
    }
    categoryId = category.id;
    await ensureDir(config.categoryTitleIdPath);
    await writeJson(idFilePath, { id: categoryId });
  }

  const memberCount = getGuildMemberCount();
  const newName = `${config.serverTitle} | ${memberCount} members`;
  await renameCategoryById(categoryId, newName);
}
