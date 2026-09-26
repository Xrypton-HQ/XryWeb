const STORE_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_REST_API_URL;
const STORE_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_REST_TOKEN;
const BOT_KEY = process.env.BOT_API_KEY;

function configured() {
  return Boolean(STORE_URL && STORE_TOKEN);
}

async function call(command, ...args) {
  const res = await fetch(STORE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STORE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command, ...args])
  });
  if (!res.ok) throw new Error(`store responded ${res.status}`);
  return res.json();
}

async function read(key, fallback) {
  if (!configured()) return fallback;
  try {
    const out = await call('GET', key);
    if (out.result === null || out.result === undefined) return fallback;
    return JSON.parse(out.result);
  } catch (err) {
    return fallback;
  }
}

async function write(key, value) {
  if (!configured()) {
    const err = new Error('Storage is not configured. Set KV_REST_API_URL, KV_REST_API_TOKEN and BOT_API_KEY.');
    err.code = 'ENOSTORE';
    throw err;
  }
  await call('SET', key, JSON.stringify(value));
}

function authorized(req) {
  if (!BOT_KEY) return false;
  const headers = req.headers || {};
  const bearer = String(headers.authorization || '').replace(/^Bearer\s+/i, '');
  return bearer === BOT_KEY || headers['x-api-key'] === BOT_KEY;
}

module.exports = { read, write, authorized, configured };
