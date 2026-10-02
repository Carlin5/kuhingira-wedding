const loginForm = document.querySelector('#adminLogin');
const passwordInput = document.querySelector('#adminPassword');
const adminStatus = document.querySelector('#adminStatus');
const dashboard = document.querySelector('#dashboard');
const totals = document.querySelector('#totals');
const submissions = document.querySelector('#submissions');
const refreshButton = document.querySelector('#refreshSubmissions');
const inviteCreateForm = document.querySelector('#inviteCreateForm');
const inviteLabel = document.querySelector('#inviteLabel');
const inviteCount = document.querySelector('#inviteCount');
const inviteStatus = document.querySelector('#inviteStatus');
const invites = document.querySelector('#invites');
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

function setInviteStatus(message, kind = '') {
  inviteStatus.textContent = message;
  inviteStatus.className = `invite-status${kind ? ` ${kind}` : ''}`;
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

function makeInviteAction(label, action, code) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'invite-action';
  button.textContent = label;
  button.addEventListener('click', () => runInviteAction(action, code, button));
  return button;
}

function inviteUrl(code) {
  return `${window.location.origin}/?i=${code}`;
}

async function copyInviteLink(code, button) {
  const url = inviteUrl(code);
  button.disabled = true;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(url);
      setInviteStatus('Link copied.');
      return;
    }
    const temporaryInput = document.createElement('input');
    temporaryInput.value = url;
    temporaryInput.setAttribute('aria-label', 'Invitation link');
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    setInviteStatus('Copy this link manually.');
    temporaryInput.remove();
  } catch (error) {
    setInviteStatus('Copy this link manually.', 'error');
  } finally {
    button.disabled = false;
  }
}

function renderInvites(items) {
  invites.replaceChildren();
  if (!items.length) {
    invites.appendChild(makeText('p', 'empty-state', 'No invitation links yet.'));
    return;
  }

  items.forEach((invite) => {
    const card = document.createElement('article');
    card.className = 'invite-item';
    const heading = document.createElement('div');
    heading.className = 'invite-item-heading';
    heading.append(
      makeText('h3', '', text(invite.label) || 'Unnamed guest'),
      makeText('span', 'invite-code', invite.code)
    );
    card.appendChild(heading);
    card.appendChild(makeText('p', 'invite-url', inviteUrl(invite.code)));

    let statusText = 'Not opened yet';
    if (invite.revoked) {
      statusText = 'Revoked';
    } else if (invite.isBound) {
      statusText = `Locked to a device · ${formatDate(invite.boundAt)}`;
    }
    card.appendChild(makeText('p', 'invite-item-status', statusText));
    if (invite.openedCount > 0) {
      card.appendChild(makeText('p', 'invite-opened', `Opened ${invite.openedCount} ${invite.openedCount === 1 ? 'time' : 'times'}`));
    }

    const actions = document.createElement('div');
    actions.className = 'invite-actions';
    const copy = makeInviteAction('Copy link', 'copy', invite.code);
    copy.addEventListener('click', () => copyInviteLink(invite.code, copy));
    actions.appendChild(copy);
    if (invite.isBound) actions.appendChild(makeInviteAction('Reset device', 'reset', invite.code));
    actions.appendChild(makeInviteAction(invite.revoked ? 'Restore' : 'Revoke', invite.revoked ? 'restore' : 'revoke', invite.code));
    actions.appendChild(makeInviteAction('Delete', 'delete', invite.code));
    card.appendChild(actions);
    invites.appendChild(card);
  });
}

async function adminRequest(password, action, payload = {}) {
  const response = await fetch('/api/admin-invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, ...payload })
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem(storageKey);
    throw new Error(result.error || 'Could not update invitation links');
  }
  return result;
}

async function loadInvites(password) {
  try {
    const result = await adminRequest(password, 'list');
    renderInvites(result.invites);
  } catch (error) {
    setInviteStatus(error.message, 'error');
  }
}

async function runInviteAction(action, code, button) {
  const password = sessionStorage.getItem(storageKey);
  if (!password) return;
  if (action === 'reset' && !window.confirm('Reset this invitation so it can be opened on another device?')) return;
  if (action === 'delete' && !window.confirm('Delete this invitation link permanently?')) return;
  if (action === 'copy') return;

  button.disabled = true;
  try {
    await adminRequest(password, action, { code });
    setInviteStatus(action === 'delete' ? 'Invitation link deleted.' : 'Invitation link updated.');
    await loadInvites(password);
  } catch (error) {
    setInviteStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function createInvites(event) {
  event.preventDefault();
  const password = sessionStorage.getItem(storageKey);
  if (!password) return;
  const count = Number(inviteCount.value);
  if (!Number.isInteger(count) || count < 1 || count > 25) {
    setInviteStatus('Choose between 1 and 25 links.', 'error');
    return;
  }
  const button = inviteCreateForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = await adminRequest(password, 'create', {
      label: inviteLabel.value.trim(),
      count
    });
    inviteLabel.value = '';
    setInviteStatus(`Created ${result.created.length} invitation ${result.created.length === 1 ? 'link' : 'links'}.`, 'success');
    await loadInvites(password);
  } catch (error) {
    setInviteStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
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
  const password = passwordInput.value;
  loadSubmissions(password);
  loadInvites(password);
});

refreshButton.addEventListener('click', () => {
  const password = sessionStorage.getItem(storageKey);
  if (password) {
    loadSubmissions(password);
    loadInvites(password);
  }
});

inviteCreateForm.addEventListener('submit', createInvites);

const savedPassword = sessionStorage.getItem(storageKey);
if (savedPassword) {
  loadSubmissions(savedPassword);
  loadInvites(savedPassword);
}
