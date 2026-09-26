const { read, write, authorized } = require('../../lib/store');
const bundled = require('../../commands.json');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
}

function normalize(cmd) {
  if (!cmd || typeof cmd.name !== 'string' || !cmd.name.trim()) return null;
  if (typeof cmd.description !== 'string' || !cmd.description.trim()) return null;
  return {
    name: cmd.name.trim().toLowerCase(),
    usage_count: Number.isFinite(cmd.usage_count) ? cmd.usage_count : 0,
    category: typeof cmd.category === 'string' && cmd.category.trim()
      ? cmd.category.trim().toLowerCase()
      : 'uncategorized',
    description: cmd.description.trim(),
    arguments: Array.isArray(cmd.arguments)
      ? cmd.arguments.map((a) => ({
          name: String(a.name || ''),
          description: String(a.description || ''),
          required: Boolean(a.required)
        }))
      : [],
    permissions: Array.isArray(cmd.permissions) ? cmd.permissions.map(String) : []
  };
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const list = await read('commands', bundled.commands);
    const { category, name } = req.query || {};
    let results = list;

    if (category) {
      results = results.filter(
        (c) => c.category.toLowerCase() === String(category).toLowerCase()
      );
    }
    if (name) {
      results = results.filter((c) =>
        c.name.toLowerCase().includes(String(name).toLowerCase())
      );
    }

    res.status(200).json({ count: results.length, commands: results });
    return;
  }

  if (req.method === 'POST') {
    if (!authorized(req)) {
      res.status(401).json({ error: 'Missing or invalid API key.' });
      return;
    }

    const body = req.body;
    const raw = Array.isArray(body) ? body : body && body.commands;
    if (!Array.isArray(raw) || raw.length === 0) {
      res.status(400).json({ error: 'Send an array of commands, or { "commands": [...] }.' });
      return;
    }

    const clean = [];
    const seen = new Set();
    for (let i = 0; i < raw.length; i += 1) {
      const cmd = normalize(raw[i]);
      if (!cmd) {
        res.status(400).json({ error: `Command at index ${i} needs a name and description.` });
        return;
      }
      if (seen.has(cmd.name)) continue;
      seen.add(cmd.name);
      clean.push(cmd);
    }

    try {
      await write('commands', clean);
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
