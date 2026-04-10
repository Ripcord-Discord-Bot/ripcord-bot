// Tests — run with: node test.js  |  snapshot stress: node test.js --snapshot

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { parseInterval } from './scheduler.js';
import { getServerStats } from './serverstats.js';
import { isBanned } from './bannedlist.js';

// --- parseInterval ---

describe('parseInterval', () => {
  it('parses seconds', () => assert.equal(parseInterval('30s'), 30_000));
  it('parses minutes', () => assert.equal(parseInterval('5m'), 300_000));
  it('parses hours',   () => assert.equal(parseInterval('2h'), 7_200_000));
  it('parses days',    () => assert.equal(parseInterval('1d'), 86_400_000));
  it('parses weeks',   () => assert.equal(parseInterval('1w'), 604_800_000));
  it('returns null for invalid input', () => assert.equal(parseInterval('abc'), null));
  it('returns null for empty string',  () => assert.equal(parseInterval(''), null));
  it('returns null for plain number',  () => assert.equal(parseInterval('60'), null));
  it('handles string coercion',        () => assert.equal(parseInterval(10), null));
});

// --- Cron matching (inline reference impl) ---

function matchField(val, field) {
  if (field === '*') return true;
  if (field.includes(',')) return field.split(',').some((p) => matchField(val, p.trim()));
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return step > 0 && val % step === 0;
  }
  if (field.includes('-')) {
    const [lo, hi] = field.split('-').map(Number);
    return val >= lo && val <= hi;
  }
  return val === parseInt(field, 10);
}

function matchCron(expr, date) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [mF, hF, domF, monF, dowF] = parts;
  return (
    matchField(date.getMinutes(), mF) &&
    matchField(date.getHours(), hF) &&
    matchField(date.getDate(), domF) &&
    matchField(date.getMonth() + 1, monF) &&
    matchField(date.getDay(), dowF)
  );
}

// month is 1-based for readability; getDay is overridden to avoid date/dow coupling
function d(min, hour, date, month, dow) {
  const dt = new Date(2024, month - 1, date, hour, min, 0, 0);
  Object.defineProperty(dt, 'getDay', { value: () => dow });
  return dt;
}

describe('cron field: wildcard', () => {
  it('* matches any value', () => {
    assert.ok(matchField(0, '*'));
    assert.ok(matchField(59, '*'));
    assert.ok(matchField(7, '*'));
  });
});

describe('cron field: exact value', () => {
  it('matches when equal',         () => assert.ok(matchField(5, '5')));
  it('does not match when unequal',() => assert.ok(!matchField(4, '5')));
});

describe('cron field: range', () => {
  it('matches within range',       () => assert.ok(matchField(3, '1-5')));
  it('matches at lower bound',     () => assert.ok(matchField(1, '1-5')));
  it('matches at upper bound',     () => assert.ok(matchField(5, '1-5')));
  it('does not match outside',     () => assert.ok(!matchField(6, '1-5')));
});

describe('cron field: step', () => {
  it('matches multiples of step',  () => assert.ok(matchField(15, '*/15')));
  it('matches zero with any step', () => assert.ok(matchField(0, '*/5')));
  it('does not match non-multiple',() => assert.ok(!matchField(7, '*/5')));
});

describe('cron field: list', () => {
  it('matches any listed value',   () => assert.ok(matchField(3, '1,3,5')));
  it('does not match absent value',() => assert.ok(!matchField(4, '1,3,5')));
});

describe('matchCron full expressions', () => {
  it('midnight daily',     () => assert.ok(matchCron('0 0 * * *',   d(0, 0, 1, 1, 3))));
  it('misses off-minute',  () => assert.ok(!matchCron('0 0 * * *',  d(1, 0, 1, 1, 3))));
  it('every 15 minutes',   () => assert.ok(matchCron('*/15 * * * *', d(30, 6, 1, 1, 3))));
  it('mondays at 9am',     () => assert.ok(matchCron('0 9 * * 1',   d(0, 9, 1, 1, 1))));
  it('not tue for monday', () => assert.ok(!matchCron('0 9 * * 1',  d(0, 9, 1, 1, 2))));
  it('rejects bad expr',   () => assert.ok(!matchCron('0 0 * *',     d(0, 0, 1, 1, 0))));
  it('1st of each month',  () => assert.ok(matchCron('0 8 1 * *',   d(0, 8, 1, 6, 3))));
  it('not 2nd of month',   () => assert.ok(!matchCron('0 8 1 * *',  d(0, 8, 2, 6, 3))));
});

// --- replyLongMessage chunking ---

// replyLongMessage is not exported; replicate the pure chunking logic for testing
function chunkText(text) {
  if (text.length <= 1900) return [text];
  return text.match(/[\s\S]{1,1900}/g) || [];
}

describe('replyLongMessage chunking', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('hello');
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], 'hello');
  });
  it('returns single chunk for exactly 1900 chars', () => assert.equal(chunkText('a'.repeat(1900)).length, 1));
  it('splits text longer than 1900 chars',           () => assert.equal(chunkText('a'.repeat(1901)).length, 2));
  it('no chunk exceeds 1900 chars', () => {
    const chunks = chunkText('x'.repeat(5000));
    assert.ok(chunks.every((c) => c.length <= 1900));
  });
  it('chunks reconstruct the original text', () => {
    const original = 'z'.repeat(4321);
    assert.equal(chunkText(original).join(''), original);
  });
});

// --- ticket filename construction ---

function buildTicketFileName(isoString, username, messageId) {
  const date    = isoString.slice(0, 10);
  const time    = isoString.slice(11, 19).replace(/:/g, '-');
  const shortId = messageId.slice(-4);
  return `${date}_${time}_${username}_${shortId}.json`;
}

describe('ticket filename construction', () => {
  const iso   = '2026-04-09T23:53:07.000Z';
  const msgId = '1234567890abcdef5678';
  it('extracts date correctly',           () => assert.equal(iso.slice(0, 10), '2026-04-09'));
  it('extracts time and replaces colons', () => assert.equal(iso.slice(11, 19).replace(/:/g, '-'), '23-53-07'));
  it('uses last 4 chars of message id',   () => assert.equal(msgId.slice(-4), '5678'));
  it('builds correct full filename', () => {
    assert.equal(
      buildTicketFileName(iso, 'riptide00', msgId),
      '2026-04-09_23-53-07_riptide00_5678.json'
    );
  });
});

// --- serverstats — getServerStats defensive copy ---

describe('getServerStats defensive copy', () => {
  it('returns an object', () => assert.equal(typeof getServerStats(), 'object'));
  it('mutating returned stats does not affect next call', () => {
    const s = getServerStats();
    s.messages = 99999;
    assert.notEqual(getServerStats().messages, 99999);
  });
  it('mutating returned roleCounts does not affect next call', () => {
    const s = getServerStats();
    s.roleCounts['__test__'] = 42;
    assert.equal(getServerStats().roleCounts['__test__'], undefined);
  });
});

// --- filter — containsFilteredWord logic ---

// filter.js imports ai and authentication; replicate the pure match logic for testing
function makeContains(words) {
  return (content) => {
    const text = content.toLowerCase();
    return words.some((word) => text.includes(word));
  };
}

describe('containsFilteredWord', () => {
  const contains = makeContains(['badword', 'spam']);
  it('matches exact filtered word',        () => assert.ok(contains('badword')));
  it('matches filtered word as substring', () => assert.ok(contains('this is badword here')));
  it('is case insensitive',                () => assert.ok(contains('BADWORD')));
  it('matches second word in list',        () => assert.ok(contains('lots of spam today')));
  it('does not match unfiltered content',  () => assert.ok(!contains('hello world')));
  it('returns false with empty word list', () => assert.ok(!makeContains([])('anything')));
});

// --- bannedlist — isBanned lookup ---

describe('isBanned', () => {
  it('returns false for unknown id on fresh module', () => assert.ok(!isBanned('999999999')));
  it('returns false for empty string',               () => assert.ok(!isBanned('')));
});

// --- Daily snapshot integration test ---
// Fires snapshotDaily immediately then every 60s. Press Ctrl-C to stop.

if (process.argv.includes('--snapshot')) {
  const { loadServerStats, snapshotDaily } = await import('./serverstats.js');

  const logger = {
    info:  (msg) => console.log(`[INFO]  ${msg}`),
    warn:  (msg) => console.warn(`[WARN]  ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
  };

  await loadServerStats(logger);

  async function runSnapshot() {
    const date = new Date().toISOString().slice(0, 10);
    console.log(`\n[${new Date().toISOString()}] Running daily snapshot for ${date}...`);
    await snapshotDaily(date, logger);
    console.log(`[${new Date().toISOString()}] Snapshot complete. Next run in 60s. (Ctrl-C to stop)`);
  }

  await runSnapshot();
  setInterval(runSnapshot, 60_000);
}
