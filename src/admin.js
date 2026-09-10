const loginForm = document.querySelector('#adminLogin');
const passwordInput = document.querySelector('#adminPassword');
const adminStatus = document.querySelector('#adminStatus');
const dashboard = document.querySelector('#dashboard');
const totals = document.querySelector('#totals');
const submissions = document.querySelector('#submissions');
const refreshButton = document.querySelector('#refreshSubmissions');
const storageKey = 'helen-ian-guest-admin-password';

const attendingLabels = {
  kuhingira: 'Kuhingira · 26 November 2026',
  wedding: 'Wedding & Reception · 28 November 2026',
  both: 'Both celebrations'
};

function setStatus(message, kind = 'error') {
  adminStatus.textContent = message;
  adminStatus.className = `admin-status ${kind}`;
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

function makeText(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function makeLink(label, href) {
  const link = document.createElement('a');
  link.textContent = label;
  link.href = href;
  return link;
}

function renderTotals(summary) {
  totals.replaceChildren();
  [
    ['Parties', summary.parties],
    ['People', summary.people],
    ['Adults', summary.adults],
    ['Children', summary.children]
  ].forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'total-item';
    item.append(makeText('strong', '', String(value)), makeText('span', '', label));
    totals.appendChild(item);
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not available';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kampala'
  }).format(date);
}

function renderPerson(person) {
  const item = document.createElement('li');
  item.className = 'submission-person';
  const details = document.createElement('div');
  details.appendChild(makeText('strong', '', text(person.name)));
  if (person.email) details.appendChild(makeLink(person.email, `mailto:${encodeURIComponent(person.email)}`));
  if (person.phone) details.appendChild(makeLink(person.phone, `tel:${encodeURIComponent(person.phone)}`));
  item.appendChild(details);
  if (person.isChild) item.appendChild(makeText('span', 'child-badge', 'Child'));
  return item;
}

function renderSubmissions(items) {
  submissions.replaceChildren();
  if (!items.length) {
    submissions.appendChild(makeText('p', 'empty-state', 'No guest entries yet.'));
    return;
  }

  items.forEach((submission) => {
    const card = document.createElement('article');
    card.className = 'submission-card';
    const heading = document.createElement('div');
    heading.className = 'submission-heading';
    heading.append(
      makeText('h3', '', `${Array.isArray(submission.people) ? submission.people.length : 0} ${Array.isArray(submission.people) && submission.people.length === 1 ? 'person' : 'people'}`),
      makeText('time', '', formatDate(submission.submittedAt))
    );
    card.appendChild(heading);
    card.appendChild(makeText('p', 'attending', attendingLabels[submission.attending] || 'Attendance not specified'));
    if (submission.note) {
      const note = document.createElement('p');
      note.className = 'submission-note';
      note.append(makeText('strong', '', 'Message: '), document.createTextNode(text(submission.note)));
      card.appendChild(note);
    }
    const people = document.createElement('ul');
    people.className = 'submission-people';
    (Array.isArray(submission.people) ? submission.people : []).forEach((person) => {
      people.appendChild(renderPerson(person));
    });
    card.appendChild(people);
    submissions.appendChild(card);
  });
}

async function loadSubmissions(password) {
  refreshButton.disabled = true;
  refreshButton.textContent = 'Refreshing…';
  try {
    const response = await fetch('/api/admin-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem(storageKey);
      throw new Error(result.error || 'Could not load submissions');
    }
    sessionStorage.setItem(storageKey, password);
    renderTotals(result.totals);
    renderSubmissions(result.submissions);
    dashboard.hidden = false;
    loginForm.hidden = true;
    setStatus('');
  } catch (error) {
    dashboard.hidden = true;
    loginForm.hidden = false;
    setStatus(error.message);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh';
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadSubmissions(passwordInput.value);
});

refreshButton.addEventListener('click', () => {
  const password = sessionStorage.getItem(storageKey);
  if (password) loadSubmissions(password);
});

const savedPassword = sessionStorage.getItem(storageKey);
if (savedPassword) loadSubmissions(savedPassword);
