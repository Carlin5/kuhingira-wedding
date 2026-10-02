const { get, put } = require('@vercel/blob');

function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

async function readInvite(code) {
  const result = await get(`invites/${code}.json`, { access: 'private', useCache: false });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const code = normalizeCode(body.code);
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId : '';
    if (!code || !/^[A-Z0-9]+$/.test(code) || !/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) {
      res.status(400).json({ valid: false, reason: 'invalid' });
      return;
    }

    const record = await readInvite(code);
    if (!record) {
      res.status(404).json({ valid: false, reason: 'unknown' });
      return;
    }
    if (record.revoked) {
      res.status(403).json({ valid: false, reason: 'revoked' });
      return;
    }

    const now = new Date().toISOString();
    if (!record.deviceId) {
      const boundRecord = {
        ...record,
        deviceId,
        boundAt: now,
        openedCount: 1,
        lastSeenAt: now
      };
      await put(`invites/${code}.json`, JSON.stringify(boundRecord), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
      res.status(200).json({ valid: true, label: record.label || '' });
      return;
    }

    if (record.deviceId !== deviceId) {
      res.status(403).json({ valid: false, reason: 'bound' });
      return;
    }

    const lastSeen = Date.parse(record.lastSeenAt || '');
    if (!Number.isFinite(lastSeen) || Date.now() - lastSeen > 10 * 60 * 1000) {
      try {
        await put(`invites/${code}.json`, JSON.stringify({
          ...record,
          openedCount: Number.isInteger(record.openedCount) ? record.openedCount + 1 : 1,
          lastSeenAt: now
        }), {
          access: 'private',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true
        });
      } catch (error) {
        console.warn(`Could not update invite activity for ${code}`, error);
      }
    }

    res.status(200).json({ valid: true, label: record.label || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ valid: false, reason: 'error' });
  }
};
