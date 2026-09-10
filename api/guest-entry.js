const { randomUUID } = require('crypto');
const { put } = require('@vercel/blob');

const attendingOptions = new Set(['kuhingira', 'wedding', 'both']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const rawPeople = Array.isArray(body.people) ? body.people : [];
    const people = rawPeople
      .map((person) => ({
        name: text(person?.name),
        email: text(person?.email),
        phone: text(person?.phone),
        isChild: Boolean(person?.isChild)
      }))
      .filter((person) => person.name);

    if (!people.length) {
      res.status(400).json({ error: 'Please add at least one person.' });
      return;
    }
    if (people.length > 12) {
      res.status(400).json({ error: 'You can add up to 12 people.' });
      return;
    }
    if (people.some((person) => person.name.length > 120 || person.email.length > 120 || person.phone.length > 120)) {
      res.status(400).json({ error: 'Names, email addresses, and phone numbers must be 120 characters or fewer.' });
      return;
    }
    if (people.some((person) => person.email && !emailPattern.test(person.email))) {
      res.status(400).json({ error: 'Please check the email addresses.' });
      return;
    }

    const attending = text(body.attending);
    if (!attendingOptions.has(attending)) {
      res.status(400).json({ error: 'Please choose which celebration you will attend.' });
      return;
    }

    const note = text(body.note);
    if (note.length > 1000) {
      res.status(400).json({ error: 'Your message must be 1000 characters or fewer.' });
      return;
    }

    const id = randomUUID();
    const record = {
      id,
      submittedAt: new Date().toISOString(),
      attending,
      note,
      people
    };

    await put(`submissions/${Date.now()}-${id}.json`, JSON.stringify(record), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: true
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save your details' });
  }
};
