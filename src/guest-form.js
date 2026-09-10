const countryOptions = [
  ['UG', '🇺🇬 +256', '+256'],
  ['GB', '🇬🇧 +44', '+44'],
  ['US', '🇺🇸/🇨🇦 +1', '+1'],
  ['KE', '🇰🇪 +254', '+254'],
  ['RW', '🇷🇼 +250', '+250'],
  ['TZ', '🇹🇿 +255', '+255'],
  ['ZA', '🇿🇦 +27', '+27'],
  ['AE', '🇦🇪 +971', '+971'],
  ['AU', '🇦🇺 +61', '+61'],
  ['IE', '🇮🇪 +353', '+353'],
  ['DE', '🇩🇪 +49', '+49'],
  ['FR', '🇫🇷 +33', '+33'],
  ['NL', '🇳🇱 +31', '+31'],
  ['SE', '🇸🇪 +46', '+46'],
  ['NO', '🇳🇴 +47', '+47'],
  ['DK', '🇩🇰 +45', '+45'],
  ['BE', '🇧🇪 +32', '+32'],
  ['CH', '🇨🇭 +41', '+41'],
  ['IT', '🇮🇹 +39', '+39'],
  ['IN', '🇮🇳 +91', '+91'],
  ['QA', '🇶🇦 +974', '+974'],
  ['SA', '🇸🇦 +966', '+966'],
  ['CN', '🇨🇳 +86', '+86']
];

const form = document.querySelector('#guestForm');
const peopleList = document.querySelector('#peopleList');
const addPersonButton = document.querySelector('#addPerson');
const attending = document.querySelector('#attending');
const note = document.querySelector('#note');
const status = document.querySelector('#formStatus');
const submitButton = document.querySelector('#submitGuest');

const state = {
  people: [{ name: '', email: '', phone: '', country: '+256', isChild: false }]
};

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = `form-status${kind ? ` ${kind}` : ''}`;
}

function makeLabel(text, input) {
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = text;
  label.htmlFor = input.id;
  return label;
}

function makeError() {
  const error = document.createElement('p');
  error.className = 'field-error';
  error.setAttribute('aria-live', 'polite');
  return error;
}

function updatePerson(index, key, value) {
  state.people[index][key] = value;
  if (key === 'name' || key === 'email' || key === 'phone') {
    validatePerson(index);
  }
}

function validatePerson(index, showRequired = false) {
  const person = state.people[index];
  const block = peopleList.children[index];
  if (!block) return false;
  const errors = block.querySelectorAll('.field-error');
  errors.forEach((error) => { error.textContent = ''; });
  let valid = true;
  const nameError = block.querySelector('[data-error="name"]');
  const emailError = block.querySelector('[data-error="email"]');
  if (showRequired && !person.name.trim()) {
    nameError.textContent = 'Please enter a name.';
    valid = false;
  }
  if (person.name.length > 120) {
    nameError.textContent = 'Names must be 120 characters or fewer.';
    valid = false;
  }
  if (person.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email) || person.email.length > 120)) {
    emailError.textContent = person.email.length > 120
      ? 'Email addresses must be 120 characters or fewer.'
      : 'Please enter a valid email address.';
    valid = false;
  }
  if (person.phone.length > 120) {
    const phoneError = block.querySelector('[data-error="phone"]');
    phoneError.textContent = 'Phone numbers must be 120 characters or fewer.';
    valid = false;
  }
  return valid;
}

function renderPeople() {
  peopleList.replaceChildren();
  state.people.forEach((person, index) => {
    const block = document.createElement('fieldset');
    block.className = 'person-block';
    block.dataset.index = String(index);

    const legend = document.createElement('legend');
    legend.textContent = `Person ${index + 1}`;
    block.appendChild(legend);

    const name = document.createElement('input');
    name.type = 'text';
    name.id = `person-name-${index}`;
    name.name = `name`;
    name.placeholder = 'John Smith';
    name.autocomplete = 'name';
    name.value = person.name;
    name.maxLength = 120;
    block.appendChild(makeLabel('Name', name));
    block.appendChild(name);
    const nameError = makeError();
    nameError.dataset.error = 'name';
    block.appendChild(nameError);

    const email = document.createElement('input');
    email.type = 'email';
    email.id = `person-email-${index}`;
    email.name = 'email';
    email.placeholder = 'name@email.com';
    email.autocomplete = 'email';
    email.value = person.email;
    email.maxLength = 120;
    block.appendChild(makeLabel('Email Address', email));
    block.appendChild(email);
    const emailError = makeError();
    emailError.dataset.error = 'email';
    block.appendChild(emailError);

    const phoneLabel = document.createElement('span');
    phoneLabel.className = 'field-label';
    phoneLabel.textContent = 'Phone number';
    block.appendChild(phoneLabel);
    const phoneRow = document.createElement('div');
    phoneRow.className = 'phone-row';
    const country = document.createElement('select');
    country.id = `person-country-${index}`;
    country.name = 'country';
    country.setAttribute('aria-label', `Country code for person ${index + 1}`);
    countryOptions.forEach(([code, label, value]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === person.country;
      country.appendChild(option);
    });
    const phone = document.createElement('input');
    phone.type = 'tel';
    phone.id = `person-phone-${index}`;
    phone.name = 'phone';
    phone.placeholder = 'Phone number';
    phone.autocomplete = 'tel-national';
    phone.value = person.phone;
    phone.maxLength = 120;
    phoneRow.append(country, phone);
    block.appendChild(phoneRow);
    const phoneError = makeError();
    phoneError.dataset.error = 'phone';
    block.appendChild(phoneError);

    const childLabel = document.createElement('label');
    childLabel.className = 'checkbox-label';
    const child = document.createElement('input');
    child.type = 'checkbox';
    child.checked = person.isChild;
    childLabel.append(child, document.createTextNode(' This person is a child'));
    block.appendChild(childLabel);

    if (index > 0) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-person';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        state.people.splice(index, 1);
        renderPeople();
      });
      block.appendChild(remove);
    }

    name.addEventListener('input', () => updatePerson(index, 'name', name.value.trim()));
    email.addEventListener('input', () => updatePerson(index, 'email', email.value.trim()));
    country.addEventListener('change', () => updatePerson(index, 'country', country.value));
    phone.addEventListener('input', () => updatePerson(index, 'phone', phone.value.trim()));
    child.addEventListener('change', () => updatePerson(index, 'isChild', child.checked));
    peopleList.appendChild(block);
  });
  addPersonButton.disabled = state.people.length >= 12;
}

addPersonButton.addEventListener('click', () => {
  if (state.people.length >= 12) return;
  state.people.push({ name: '', email: '', phone: '', country: '+256', isChild: false });
  renderPeople();
  peopleList.lastElementChild?.querySelector('input')?.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');
  const filledPeople = state.people.filter((person) => person.name.trim());
  const valid = state.people.every((person, index) => !person.name.trim() || validatePerson(index))
    && filledPeople.length > 0;
  if (!filledPeople.length) {
    validatePerson(0, true);
    setStatus('Please add at least one person.', 'error');
    return;
  }
  if (!valid) {
    setStatus('Please check the highlighted details.', 'error');
    return;
  }

  submitButton.disabled = true;
  addPersonButton.disabled = true;
  submitButton.textContent = 'Sending…';
  try {
    const response = await fetch('/api/guest-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        people: filledPeople.map((person) => ({
          name: person.name,
          email: person.email,
          phone: [person.country, person.phone].filter(Boolean).join(' '),
          isChild: person.isChild
        })),
        attending: attending.value,
        note: note.value.trim()
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save your details');
    document.querySelector('#guestCard').innerHTML = `
      <p class="eyebrow">Thank you</p>
      <h1>Your details are with Helen &amp; Ian</h1>
      <p class="intro-copy">Thank you for letting us know. We look forward to celebrating with you.</p>
      <a class="submit-button link-button" href="index.html">Back to the invitation</a>
    `;
  } catch (error) {
    submitButton.disabled = false;
    addPersonButton.disabled = state.people.length >= 12;
    submitButton.textContent = 'Done';
    setStatus(error.message, 'error');
  }
});

renderPeople();
