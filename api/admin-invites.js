const { createHash, randomInt, timingSafeEqual } = require('crypto');
const { del, get, list, put } = require('@vercel/blob');

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

function pathname(code) {
  return `invites/${code}.json`;
}

function makeCode() {
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

async function readInvite(code) {
  const result = await get(pathname(code), { access: 'private', useCache: false });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

async function requireInvite(code) {
  const record = await readInvite(code);
  if (!record) {
    const error = new Error('Invite not found');
    error.statusCode = 404;
    throw error;
  }
  return record;
}

async function listInvites() {
  const blobs = [];
  let cursor;
  do {
    const result = await list({
      prefix: 'invites/',
      ...(cursor ? { cursor } : {})
    });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const invites = [];
  for (const blob of blobs) {
    try {
      const record = await readInvite(blob.pathname.slice('invites/'.length, -'.json'.length));
      if (record) invites.push({
        code: record.code,
        label: record.label || '',
        createdAt: record.createdAt || null,
        boundAt: record.boundAt || null,
        lastSeenAt: record.lastSeenAt || null,
        openedCount: Number.isInteger(record.openedCount) ? record.openedCount : 0,
        revoked: Boolean(record.revoked),
        isBound: Boolean(record.deviceId)
      });
    } catch (error) {
      console.warn(`Skipping unreadable invite ${blob.pathname}`, error);
    }
  }

  invites.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return invites;
}

async function createInvites(label, count) {
  const created = [];
  for (let index = 0; index < count; index += 1) {
    let code;
    let available = false;
    for (let attempt = 0; attempt < 5 && !available; attempt += 1) {
      code = makeCode();
      available = !(await readInvite(code));
    }
    if (!available) throw new Error('Could not generate a unique invite code');

    const now = new Date().toISOString();
    await put(pathname(code), JSON.stringify({
      code,
      label,
      createdAt: now,
      deviceId: null,
      boundAt: null,
      lastSeenAt: null,
      openedCount: 0,
      revoked: false
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false
    });
    created.push(code);
  }
  return created;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const expectedPassword = process.env.GUEST_ADMIN_PASSWORD;
    if (!expectedPassword) {
      res.status(500).json({ error: 'Admin access is not configured' });
      return;
    }

    const body = parseBody(req);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!timingSafeEqual(digest(password), digest(expectedPassword))) {
      res.status(401).json({ error: 'Wrong password' });
      return;
    }

    const action = body.action;
    if (action === 'list') {
      res.status(200).json({ invites: await listInvites() });
      return;
    }

    if (action === 'create') {
      const rawCount = body.count === undefined || body.count === '' ? 1 : Number(body.count);
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!Number.isInteger(rawCount) || rawCount < 1 || rawCount > 25 || label.length > 120) {
        res.status(400).json({ error: 'Please provide a valid label and count.' });
        return;
      }
      res.status(200).json({ created: await createInvites(label, rawCount) });
      return;
    }

    const code = normalizeCode(body.code);
    if (!code || !/^[A-Z0-9]+$/.test(code)) {
      res.status(400).json({ error: 'Invalid invite code' });
      return;
    }

    if (action === 'delete') {
      await del(pathname(code));
      res.status(200).json({ ok: true });
      return;
    }

    const record = await requireInvite(code);
    if (action === 'reset') {
      await put(pathname(code), JSON.stringify({
        ...record,
        deviceId: null,
        boundAt: null,
        lastSeenAt: null,
        openedCount: 0
      }), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'revoke' || action === 'restore') {
      await put(pathname(code), JSON.stringify({
        ...record,
        revoked: action === 'revoke'
      }), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Could not update invite links' });
  }
};
