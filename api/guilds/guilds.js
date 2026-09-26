const { read, write, authorized } = require('../../lib/store');

const FALLBACK = [
  { name: 'night city', members: 49717, verified: true },
  { name: 'pixel haven', members: 12480, verified: true },
  { name: 'sakura squad', members: 8921, verified: true },
  { name: 'void.', members: 31045, verified: true },
  { name: 'nova guild', members: 22760, verified: true },
  { name: 'elysium', members: 6402, verified: true },
  { name: 'dev hub', members: 15338, verified: true },
  { name: 'retrowave', members: 8104, verified: true },
  { name: 'titan falls', members: 19672, verified: true },
  { name: 'arcadia', members: 4509, verified: true }
];

const MAX_GUILDS = 50;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
}

function normalize(g) {
  if (!g || typeof g.name !== 'string' || !g.name.trim()) return null;
  const icon = typeof g.icon === 'string' && /^https?:\/\//i.test(g.icon) ? g.icon : '';
  return {
    name: g.name.trim().slice(0, 80),
    members: Number.isFinite(g.members) && g.members >= 0 ? Math.round(g.members) : 0,
    icon,
    verified: g.verified !== false
  };
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const guilds = await read('guilds', FALLBACK);
    res.status(200).json({ count: guilds.length, guilds });
    return;
  }

  if (req.method === 'POST') {
    if (!authorized(req)) {
      res.status(401).json({ error: 'Missing or invalid API key.' });
      return;
    }

    const body = req.body;
    const raw = Array.isArray(body) ? body : body && body.guilds;
    if (!Array.isArray(raw) || raw.length === 0) {
      res.status(400).json({ error: 'Send an array of guilds, or { "guilds": [...] }.' });
      return;
    }

    const clean = [];
    for (let i = 0; i < Math.min(raw.length, MAX_GUILDS); i += 1) {
      const guild = normalize(raw[i]);
      if (!guild) {
        res.status(400).json({ error: `Guild at index ${i} needs a name.` });
        return;
      }
      clean.push(guild);
    }

    try {
      await write('guilds', clean);
    } catch (err) {
      res.status(err.code === 'ENOSTORE' ? 503 : 502).json({ error: err.message });
      return;
    }

    res.status(200).json({ ok: true, count: clean.length });
    return;
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).json({ error: `${req.method} not allowed.` });
};
