// API client — communicates with the bot's HTTP API server

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN = import.meta.env.VITE_API_TOKEN || null

async function request(method, path, body) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  const opts = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  getStats:          ()        => request('GET',    '/stats'),
  getStatsHistory:   (days = 30) => request('GET',    `/stats/history?days=${days}`),
  getFilter:     ()           => request('GET',    '/filter'),
  addFilter:     (word)       => request('POST',   '/filter', { word }),
  removeFilter:  (word)       => request('DELETE', `/filter/${encodeURIComponent(word)}`),
  getKickList:   ()           => request('GET',    '/autokicker'),
  addToKickList: (userId)     => request('POST',   '/autokicker', { userId }),
  removeFromKickList: (userId) => request('DELETE', `/autokicker/${encodeURIComponent(userId)}`),
  getBanList:    ()           => request('GET',    '/bannedusers'),
  addToBanList:  (userId)     => request('POST',   '/bannedusers', { userId }),
  removeFromBanList: (userId) => request('DELETE', `/bannedusers/${encodeURIComponent(userId)}`),
  getLogs:       (date)       => request('GET',    `/logs${date ? `?date=${date}` : ''}`),
  getTickets:    ()           => request('GET',    '/tickets'),
  deleteTicket:  (id)         => request('DELETE', `/tickets/${encodeURIComponent(id)}`),
  getConfig:         ()            => request('GET',    '/config'),
  saveConfig:        (fields)      => request('POST',   '/config', { fields }),
  getSchedules:      ()            => request('GET',    '/schedules'),
  addTask:           (task)        => request('POST',   '/schedules', task),
  deleteTask:        (id)          => request('DELETE', `/schedules/${encodeURIComponent(id)}`),
  enableTask:        (id)          => request('POST',   `/schedules/${encodeURIComponent(id)}/enable`),
  disableTask:       (id)          => request('POST',   `/schedules/${encodeURIComponent(id)}/disable`),
  runTask:           (id)          => request('POST',   `/schedules/${encodeURIComponent(id)}/run`),
  getChannels:       ()            => request('GET',    '/channels'),

  // Invites
  getInvites:        ()            => request('GET',    '/invites'),
  createInvite:      (fields)      => request('POST',   '/invites', fields),
  deleteInvite:      (code)        => request('DELETE', `/invites/${encodeURIComponent(code)}`),
}
