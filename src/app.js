const events = {
  kuhingira: {
    title: 'Helen & Ian Kuhingira',
    start: '20261126T120000',
    end: '20261126T180000',
    location: 'Late B. Nyakapanka’s Residence, Nkokonjeru, Mbarara',
    details: 'Helen & Ian Kuhingira. See you on our special day.'
  },
  wedding: {
    title: 'Helen & Ian Wedding',
    start: '20261128T100000',
    end: '20261128T180000',
    location: 'St Peter’s Cathedral, Rugarama, Kabale, Uganda; Reception at Kabale Golf Course',
    details: 'Helen & Ian Wedding Ceremony at St Peter’s Cathedral, followed by reception at Kabale Golf Course. RSVP: Beckie Rwanika White.'
  }
};

const countdownTarget = new Date('2026-11-26T12:00:00+03:00').getTime();
const unitNodes = document.querySelectorAll('[data-unit]');

function updateCountdown() {
  const diff = Math.max(0, countdownTarget - Date.now());
  const seconds = Math.floor(diff / 1000);
  const values = {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60
  };

  unitNodes.forEach((node) => {
    const unit = node.dataset.unit;
    node.textContent = values[unit].toLocaleString('en-GB', { minimumIntegerDigits: unit === 'days' ? 1 : 2 });
  });
}

function escapeIcs(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function makeEventIcs(event) {
  return [
    'BEGIN:VEVENT',
    `UID:${event.start}-helen-ian@invitation`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    `DESCRIPTION:${escapeIcs(event.details)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeIcs(event.title)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Tomorrow: ${escapeIcs(event.title)}`,
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');
}

function downloadCalendar(selectedEvents, filename) {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Helen and Ian Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...selectedEvents.map(makeEventIcs),
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function wireCalendarButtons() {
  document.querySelector('#addBothCalendar')?.addEventListener('click', () => {
    downloadCalendar([events.kuhingira, events.wedding], 'helen-ian-kuhingira-wedding.ics');
  });

  document.querySelectorAll('.calendar-event').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const key = button.dataset.event;
      downloadCalendar([events[key]], `helen-ian-${key}.ics`);
    });
  });
}

function wireFlipCards() {
  document.querySelectorAll('.flip-card').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
  });
}

async function renderGallery() {
  const response = await fetch('public/assets/manifest.json');
  const { photos } = await response.json();
  const marqueeTrack = document.querySelector('#marqueeTrack');
  const galleryGrid = document.querySelector('#galleryGrid');

  const marqueePhotos = [...photos.slice(0, 16), ...photos.slice(0, 16)];
  marqueeTrack.innerHTML = marqueePhotos
    .map((photo, index) => `<img src="public/${photo.src}" alt="Helen and Ian memory ${index + 1}" loading="lazy">`)
    .join('');

  galleryGrid.innerHTML = photos
    .map((photo, index) => `
      <figure class="gallery-item reveal" style="--delay:${index % 6}">
        <img src="public/${photo.src}" alt="Helen and Ian memory ${index + 1}" loading="lazy">
      </figure>
    `)
    .join('');

  observeReveals();
}

let revealObserver;
function observeReveals() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  document.querySelectorAll('.reveal:not(.is-visible)').forEach((element) => {
    element.style.transitionDelay = element.style.getPropertyValue('--delay') ? `${Number(element.style.getPropertyValue('--delay')) * 70}ms` : '';
    revealObserver.observe(element);
  });
}

function addPetalElements() {
  const host = document.querySelector('.petals');
  if (!host) return;
  for (let index = 0; index < 18; index += 1) {
    const petal = document.createElement('span');
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDelay = `${Math.random() * -18}s`;
    petal.style.animationDuration = `${12 + Math.random() * 16}s`;
    host.appendChild(petal);
  }
}

function init() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
  wireCalendarButtons();
  wireFlipCards();
  addPetalElements();
  observeReveals();
  renderGallery().catch(() => {
    document.querySelector('#galleryGrid').innerHTML = '<p>Photos are loading. Please refresh if they do not appear.</p>';
  });
}

init();
