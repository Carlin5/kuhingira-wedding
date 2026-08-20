const events = {
  kuhingira: {
    label: 'Kuhingira · 26 November 2026',
    title: 'Helen & Ian Kuhingira',
    start: '20261126T120000',
    end: '20261126T180000',
    startUtc: '20261126T090000Z',
    endUtc: '20261126T150000Z',
    startIso: '2026-11-26T12:00:00+03:00',
    endIso: '2026-11-26T18:00:00+03:00',
    location: 'Late B. Nyakapanka’s Residence, Nkokonjeru, Mbarara',
    details: 'Helen & Ian Kuhingira. See you on our special day.'
  },
  wedding: {
    label: 'Wedding & Reception · 28 November 2026',
    title: 'Helen & Ian Wedding',
    start: '20261128T100000',
    end: '20261128T180000',
    startUtc: '20261128T070000Z',
    endUtc: '20261128T150000Z',
    startIso: '2026-11-28T10:00:00+03:00',
    endIso: '2026-11-28T18:00:00+03:00',
    location: 'St Peter’s Cathedral, Rugarama, Kabale, Uganda; Reception at Kabale Golf Course',
    details: 'Helen & Ian Wedding Ceremony at St Peter’s Cathedral, followed by reception at Kabale Golf Course. RSVP: Beckie Rwanika White.'
  }
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const countdownTarget = new Date('2026-11-26T12:00:00+03:00').getTime();

/* ---------- countdown ---------- */

const unitNodes = document.querySelectorAll('[data-unit]');
const lastValues = new Map();

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
    const text = String(values[unit]).padStart(unit === 'days' ? 1 : 2, '0');
    if (lastValues.get(unit) === text) return;
    lastValues.set(unit, text);
    node.textContent = text;
    if (reduceMotion) return;
    node.classList.remove('tick');
    void node.offsetWidth;
    node.classList.add('tick');
  });
}

/* ---------- calendar ---------- */

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

function googleUrl(event) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.startUtc}/${event.endUtc}`,
    details: event.details,
    location: event.location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookUrl(event) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startIso,
    enddt: event.endIso,
    body: event.details,
    location: event.location
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function yahooUrl(event) {
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: event.startUtc,
    et: event.endUtc,
    desc: event.details,
    in_loc: event.location
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function calendarOptions(keys) {
  const rows = [];
  keys.forEach((key) => {
    const event = events[key];
    if (keys.length > 1) rows.push(`<p class="cal-group">${event.label}</p>`);
    rows.push(`
      <a class="cal-option google" href="${googleUrl(event)}" target="_blank" rel="noreferrer">Google Calendar</a>
      <a class="cal-option outlook" href="${outlookUrl(event)}" target="_blank" rel="noreferrer">Outlook / Microsoft 365</a>
      <a class="cal-option yahoo" href="${yahooUrl(event)}" target="_blank" rel="noreferrer">Yahoo Calendar</a>
    `);
  });
  const file = keys.length > 1 ? 'both' : keys[0];
  rows.push(`<button class="cal-option apple" type="button" data-ics="${file}">iPhone, Apple or other calendar</button>`);
  return rows.join('');
}

function wireCalendarButtons() {
  const sheet = document.querySelector('#calSheet');
  const panel = document.querySelector('#calOptions');
  const title = document.querySelector('#calTitle');
  const close = document.querySelector('#calClose');
  if (!sheet || !panel || !title || !close) return;

  const hide = () => {
    sheet.classList.remove('is-open');
    window.setTimeout(() => {
      sheet.hidden = true;
    }, 280);
  };

  const show = (keys) => {
    title.textContent = keys.length > 1
      ? 'Kuhingira & Wedding · 26 and 28 November 2026'
      : events[keys[0]].label;
    panel.innerHTML = calendarOptions(keys);
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
  };

  document.querySelectorAll('[data-calendar]').forEach((button) => {
    button.addEventListener('click', (clickEvent) => {
      clickEvent.stopPropagation();
      const target = button.dataset.calendar;
      show(target === 'both' ? ['kuhingira', 'wedding'] : [target]);
    });
  });

  panel.addEventListener('click', (clickEvent) => {
    const trigger = clickEvent.target.closest('[data-ics]');
    if (trigger) {
      const key = trigger.dataset.ics;
      if (key === 'both') {
        downloadCalendar([events.kuhingira, events.wedding], 'helen-ian-kuhingira-wedding.ics');
      } else {
        downloadCalendar([events[key]], `helen-ian-${key}.ics`);
      }
    }
    if (trigger || clickEvent.target.closest('a')) hide();
  });

  close.addEventListener('click', hide);
  sheet.addEventListener('click', (clickEvent) => {
    if (clickEvent.target === sheet) hide();
  });
  document.addEventListener('keydown', (clickEvent) => {
    if (clickEvent.key === 'Escape' && !sheet.hidden) hide();
  });
}

/* ---------- envelope intro ---------- */

function splitHeroName() {
  const heading = document.querySelector('[data-letters]');
  if (!heading) return;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        [...child.textContent].forEach((character) => {
          const span = document.createElement('span');
          span.className = 'letter';
          span.textContent = character === ' ' ? '\u00a0' : character;
          fragment.appendChild(span);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(heading);
  heading.querySelectorAll('.letter').forEach((letter, index) => {
    letter.style.transitionDelay = `${index * 45}ms`;
  });
}

function playHeroIntro() {
  document.querySelector('.hero-name')?.classList.add('is-in');
  document.querySelectorAll('.hero-copy .stagger').forEach((node, index) => {
    node.style.transitionDelay = `${420 + index * 130}ms`;
    node.classList.add('is-in');
  });
}

function wireEnvelope() {
  const envelope = document.querySelector('#envelope');
  const stage = document.querySelector('#envelopeStage');
  if (!envelope || !stage) return;

  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    envelope.classList.add('is-opening');
    envelope.setAttribute('aria-expanded', 'true');
    const liftDelay = reduceMotion ? 0 : 620;
    const zoomDelay = reduceMotion ? 0 : 1750;
    const revealDelay = reduceMotion ? 0 : 2350;

    window.setTimeout(() => envelope.classList.add('is-lifting'), liftDelay);
    window.setTimeout(() => envelope.classList.add('is-zooming'), zoomDelay);
    window.setTimeout(() => {
      document.body.classList.remove('is-sealed');
      playHeroIntro();
      window.setTimeout(() => stage.setAttribute('aria-hidden', 'true'), 900);
    }, revealDelay);
  };

  envelope.addEventListener('click', open);
  stage.addEventListener('click', (event) => {
    if (event.target === stage) open();
  });
}

/* ---------- flip cards + tilt ---------- */

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

function wireTilt() {
  if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.tilt').forEach((card) => {
    let frame = 0;
    const apply = (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tilt-y', `${x * 12}deg`);
        card.style.setProperty('--tilt-x', `${-y * 10}deg`);
      });
    };
    card.addEventListener('pointermove', apply);
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--tilt-x', '0deg');
    });
  });
}

/* ---------- scroll driven motion ---------- */

const isSmallScreen = window.matchMedia('(max-width: 900px)').matches;

function wireScrollMotion() {
  const bar = document.querySelector('.scroll-progress span');
  const parallaxNodes = reduceMotion || isSmallScreen
    ? []
    : [...document.querySelectorAll('[data-parallax]')];
  let frame = 0;

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrolled / max) : 0})`;
      parallaxNodes.forEach((node) => {
        node.style.translate = `0 ${(scrolled * Number(node.dataset.parallax)).toFixed(1)}px`;
      });
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- reveals ---------- */

let revealObserver;
function observeReveals() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal:not(.is-visible)').forEach((element) => {
    const delay = element.dataset.delay;
    if (delay) element.style.transitionDelay = `${Number(delay) * 70}ms`;
    revealObserver.observe(element);
  });
}

function observeTimeline() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      timeline.classList.add('is-drawn');
      observer.disconnect();
    });
  }, { threshold: 0.2 });
  observer.observe(timeline);
}

function observeVideos() {
  const videos = [...document.querySelectorAll('[data-lazy-video]')];
  if (!videos.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.preload = 'auto';
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.25 });
  videos.forEach((video) => observer.observe(video));
}

/* ---------- gallery ---------- */

function wireLightbox() {
  const lightbox = document.querySelector('#lightbox');
  const image = document.querySelector('#lightboxImage');
  const close = document.querySelector('#lightboxClose');
  if (!lightbox || !image || !close) return;

  const hide = () => {
    lightbox.classList.remove('is-open');
    window.setTimeout(() => {
      lightbox.hidden = true;
      image.removeAttribute('src');
    }, 320);
  };

  document.querySelector('#galleryGrid')?.addEventListener('click', (event) => {
    const picture = event.target.closest('.gallery-item img');
    if (!picture) return;
    image.src = picture.src;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
  });

  close.addEventListener('click', hide);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.hidden) hide();
  });
}

const globeRings = [
  { lat: 34, count: 5, size: 22, offset: 36 },
  { lat: 0, count: 7, size: 29, offset: 0 },
  { lat: -34, count: 5, size: 22, offset: 36 }
];

function renderGlobe(photos) {
  const globe = document.querySelector('#photoGlobe');
  if (!globe || !photos.length) return;

  let index = 0;
  const faces = [];
  globeRings.forEach((ring) => {
    for (let slot = 0; slot < ring.count; slot += 1) {
      const photo = photos[index % photos.length];
      index += 1;
      const rot = ring.offset + (slot * 360) / ring.count;
      faces.push(`
        <figure class="globe-face" style="--rot: ${rot.toFixed(2)}deg; --lat: ${ring.lat}deg; --size: ${ring.size}%">
          <img src="public/${photo.src}" alt="Helen and Ian" loading="lazy" decoding="async">
        </figure>
      `);
    }
  });
  globe.innerHTML = faces.join('');
}

async function renderGallery() {
  const response = await fetch('public/assets/manifest.json');
  const { photos } = await response.json();
  renderGlobe(photos);
  const trackOne = document.querySelector('#marqueeTrack');
  const trackTwo = document.querySelector('#marqueeTrackTwo');
  const galleryGrid = document.querySelector('#galleryGrid');

  const strip = (list) => [...list, ...list]
    .map((photo) => `<img src="public/${photo.src}" alt="Helen and Ian" loading="lazy" decoding="async">`)
    .join('');

  if (trackOne) trackOne.innerHTML = strip(photos.slice(0, 14));
  if (trackTwo) trackTwo.innerHTML = strip(photos.slice(14, 28));

  galleryGrid.innerHTML = photos
    .map((photo, index) => `
      <figure class="gallery-item reveal" data-delay="${index % 5}">
        <img src="public/${photo.src}" alt="Helen and Ian, photo ${index + 1}" loading="lazy" decoding="async">
      </figure>
    `)
    .join('');

  observeReveals();
}

/* ---------- petals ---------- */

function addPetals() {
  const host = document.querySelector('.petals');
  if (!host || reduceMotion) return;
  if (isSmallScreen && window.matchMedia('(hover: none)').matches) return;
  const count = window.innerWidth < 700 ? 6 : 14;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const petal = document.createElement('span');
    petal.style.left = `${(index / count) * 100 + Math.random() * 6}%`;
    petal.style.animationDelay = `${Math.random() * -20}s`;
    petal.style.animationDuration = `${16 + Math.random() * 14}s`;
    fragment.appendChild(petal);
  }
  host.appendChild(fragment);
}

/* ---------- init ---------- */

function init() {
  splitHeroName();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  wireCalendarButtons();
  wireEnvelope();
  wireFlipCards();
  wireTilt();
  wireScrollMotion();
  wireLightbox();
  observeTimeline();
  observeVideos();
  addPetals();
  observeReveals();

  if (reduceMotion) {
    document.body.classList.remove('is-sealed');
    playHeroIntro();
  }

  renderGallery().catch(() => {
    const grid = document.querySelector('#galleryGrid');
    if (grid) grid.innerHTML = '<p>Photos are loading. Please refresh if they do not appear.</p>';
  });
}

init();
