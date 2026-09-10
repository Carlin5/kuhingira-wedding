const { createHash, timingSafeEqual } = require('crypto');
const { get, list } = require('@vercel/blob');

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

function digest(value) {
  return createHash('sha256').update(value).digest();
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
    const matches = timingSafeEqual(digest(password), digest(expectedPassword));
    if (!matches) {
      res.status(401).json({ error: 'Wrong password' });
      return;
    }

    const blobs = [];
    let cursor;
    do {
      const result = await list({
        prefix: 'submissions/',
        ...(cursor ? { cursor } : {})
      });
      blobs.push(...result.blobs);
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    const submissions = [];
    for (const blob of blobs) {
      try {
        const response = await get(blob.pathname, { access: 'private' });
        const text = await new Response(response.stream).text();
        submissions.push(JSON.parse(text));
      } catch (error) {
        console.warn(`Skipping unreadable submission ${blob.pathname}`, error);
      }
    }

    submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const people = submissions.flatMap((submission) => Array.isArray(submission.people) ? submission.people : []);
    const children = people.filter((person) => person.isChild).length;

    res.status(200).json({
      submissions,
      totals: {
        parties: submissions.length,
        people: people.length,
        adults: people.length - children,
        children
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load submissions' });
  }
};
