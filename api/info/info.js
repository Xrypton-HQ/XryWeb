const { read, write, authorized } = require('../../lib/store');

const FALLBACK = { guilds: 500, users: 10000 };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
}

function pick(body, keys) {
  for (const key of keys) {
    const value = body[key];
    if (Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  return null;
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const info = await read('info', FALLBACK);
    res.status(200).json({
      guilds: Number.isFinite(info.guilds) ? info.guilds : FALLBACK.guilds,
      users: Number.isFinite(info.users) ? info.users : FALLBACK.users
    });
    return;
  }

  if (req.method === 'POST') {
    if (!authorized(req)) {
      res.status(401).json({ error: 'Missing or invalid API key.' });
      return;
    }

    const body = req.body || {};
    const guilds = pick(body, ['guilds', 'guild_count', 'guildCount']);
    const users = pick(body, ['users', 'user_count', 'userCount', 'members']);

    if (guilds === null && users === null) {
      res.status(400).json({ error: 'Body must include "guilds" and/or "users" as numbers.' });
      return;
    }

    const current = await read('info', FALLBACK);
    const next = { ...current };
    if (guilds !== null) next.guilds = guilds;
    if (users !== null) next.users = users;

    try {
      await write('info', next);
    } catch (err) {
      res.status(err.code === 'ENOSTORE' ? 503 : 502).json({ error: err.message });
      return;
    }

    res.status(200).json({ ok: true, info: next });
    return;
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).json({ error: `${req.method} not allowed.` });
};
