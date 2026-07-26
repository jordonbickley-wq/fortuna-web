const authArea = document.getElementById('auth-area');
const loginBtn = document.getElementById('login-btn');
const loginHint = document.getElementById('login-hint');
const dreamInput = document.getElementById('dream-input');
const revealBtn = document.getElementById('reveal-btn');
const resultCard = document.getElementById('result-card');
const footerDraw = document.getElementById('footer-draw');

// Escapes text that came from user input (or is echoed back from the
// server based on user input) before it's inserted via innerHTML.
// Without this, typing something like <img src=x onerror=...> into the
// plate/phone/name fields would execute as HTML - the server returns
// whatever was submitted, so escaping has to happen here on render.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

let currentUser = null;
let lineLoginAvailable = true;

async function loadMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  currentUser = data.user;
  lineLoginAvailable = data.lineLoginAvailable;
  renderAuthArea();
  maybeShowLineComingSoonNotice();
}

function maybeShowLineComingSoonNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lineComingSoon') === '1') {
    loginHint.textContent = 'LINE sign-in is launching soon — for now you\'re browsing as a guest, and your personal number and Draw Pass still work normally.';
    loginHint.classList.remove('hidden');
    // clean the URL so a refresh doesn't keep re-showing this
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function renderAuthArea() {
  if (currentUser && !currentUser.isGuest) {
    loginHint.classList.add('hidden');
    authArea.innerHTML = `
      <div class="nav-user">
        <img src="${currentUser.pictureUrl || ''}" alt="">
        <span>${currentUser.displayName}</span>
        <a class="logout-link" href="/auth/logout">Sign out</a>
      </div>
    `;
  } else {
    authArea.innerHTML = `<button class="nav-cta" id="login-btn">${lineLoginAvailable ? 'Sign in with LINE' : 'Sign in with LINE (soon)'}</button>`;
    document.getElementById('login-btn').addEventListener('click', () => {
      window.location.href = '/auth/line/login';
    });
  }
}

async function loadDraw() {
  const res = await fetch('/api/draw');
  const draw = await res.json();
  footerDraw.textContent = draw.isToday ? 'Government Lottery draw day is today!' : `Next Government Lottery draw: ${draw.date} (${draw.daysAway} days)`;
}

function medallion(value, extraClass = '') {
  return `<div class="medallion ${extraClass}">${value}</div>`;
}

function renderResult(data) {
  const { matched, readings, personalNumber, hasUnlock, paymentsAvailable, draw, pricing } = data;

  if (!matched) {
    resultCard.innerHTML = `
      <div class="result-tag">Reading</div>
      <div class="result-headline">No specific match yet</div>
      <div class="result-body">We don't have that symbol in the dictionary yet — try describing another part of the dream.</div>
      <div class="medallions">${medallion(personalNumber, 'personal')}</div>
    `;
    resultCard.classList.remove('hidden');
    return;
  }

  const readingsHtml = readings
    .map(
      (r) => `
      <div class="result-headline">🐍 Reading</div>
      <div class="result-body">${r.interpretation}</div>
      <div class="medallions">
        ${
          r.locked
            ? `${medallion('🔒', 'locked')}${medallion('🔒', 'locked')}${medallion('🔒', 'locked')}`
            : r.luckyNumbers.map((n) => medallion(n)).join('')
        }
        ${medallion(personalNumber, 'personal')}
      </div>
    `
    )
    .join('<hr style="border:none;border-top:1px dashed rgba(60,47,34,0.2);margin:16px 0;">');

  const needsUnlock = readings.some((r) => r.locked);

  const paywallHtml = !needsUnlock
    ? ''
    : paymentsAvailable
    ? `<div class="paywall" id="paywall">
         <p>${pricing.drawPassLabel}</p>
         <button class="unlock-btn" id="unlock-btn">Unlock — ${(pricing.drawPassAmountSatang / 100).toFixed(0)} THB</button>
       </div>
       <div class="qr-panel hidden" id="qr-panel"></div>`
    : `<div class="paywall"><p>Premium numbers unlock is launching soon — check back shortly!</p></div>`;

  resultCard.innerHTML = `
    <div class="result-tag">Your reading</div>
    ${readingsHtml}
    ${paywallHtml}
    <div class="result-footer">
      <span>${hasUnlock ? 'This Government Lottery draw is unlocked ✨' : 'Green number = your personal number today'}</span>
      <span class="draw-pill">📅 ${draw.isToday ? 'Government Lottery draw is today!' : `${draw.daysAway} days to Government Lottery draw`}</span>
    </div>
  `;
  resultCard.classList.remove('hidden');

  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => startUnlock());
  }
}

async function startUnlock() {
  const res = await fetch('/api/unlock', { method: 'POST' });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  if (data.comingSoon) {
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.innerHTML = `<p>${data.message}</p>`;
    return;
  }

  const qrPanel = document.getElementById('qr-panel');
  const paywall = document.getElementById('paywall');
  if (paywall) paywall.classList.add('hidden');
  qrPanel.classList.remove('hidden');
  qrPanel.innerHTML = `
    <p>Scan with your banking app to pay ${(data.amountSatang / 100).toFixed(0)} THB via PromptPay</p>
    ${data.qrImageUrl ? `<img src="${data.qrImageUrl}" alt="PromptPay QR code">` : '<p>QR code unavailable — check Omise configuration.</p>'}
    <p id="unlock-status">Waiting for payment...</p>
  `;

  pollUnlockStatus(data.chargeId);
}

function pollUnlockStatus(chargeId) {
  const statusEl = document.getElementById('unlock-status');
  const interval = setInterval(async () => {
    const res = await fetch(`/api/unlock/status?chargeId=${encodeURIComponent(chargeId)}`);
    const data = await res.json();
    if (data.status === 'successful') {
      clearInterval(interval);
      if (statusEl) statusEl.textContent = 'Payment confirmed! Refreshing your reading...';
      const text = dreamInput.value;
      setTimeout(() => revealDream(text), 800);
    }
  }, 3000);
}

async function revealDream(text) {
  if (!text || !text.trim()) return;
  revealBtn.disabled = true;
  try {
    const res = await fetch('/api/dream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    renderResult(data);
  } finally {
    revealBtn.disabled = false;
  }
}

revealBtn.addEventListener('click', () => revealDream(dreamInput.value));
dreamInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') revealDream(dreamInput.value);
});

loadMe();
loadDraw();

/* ================= today's fortune ================= */
async function loadToday() {
  const res = await fetch('/api/today');
  const data = await res.json();
  document.getElementById('color-swatch').style.background = data.color.hex;
  document.getElementById('color-name').textContent = `Color of the Day: ${data.color.name}`;
  const moonEl = document.getElementById('moon-phase');
  if (moonEl) moonEl.textContent = data.moonPhase;
}

async function loadCountdown() {
  const res = await fetch('/api/draw');
  const draw = await res.json();
  const sub = document.getElementById('countdown-sub');
  if (sub) sub.textContent = draw.isToday ? 'Government Lottery draw is today!' : `${draw.date} · ${draw.daysAway} days away`;
}

/* ================= module mini-panels ================= */
document.querySelectorAll('.try-btn[data-panel]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.panel).classList.toggle('open');
  });
});

function ringHtml(label, pct) {
  const deg = Math.round(pct * 3.6);
  return `<div class="ring">
    <div class="ring-circle" style="background:conic-gradient(var(--gold-bright) ${deg}deg, rgba(244,233,208,0.12) 0);"><span>${pct}</span></div>
    <div class="ring-label">${label}</div>
  </div>`;
}

async function populateZodiacOptions() {
  // pull the animal list from the same endpoint that validates the reading
  // request, so the dropdown never drifts out of sync with the server
  const select = document.getElementById('zodiac-select');
  if (!select) return;
  try {
    const res = await fetch('/api/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    const options = data.options || [];
    select.innerHTML = '<option value="">Choose your year animal...</option>' + options.map((a) => `<option>${a}</option>`).join('');
  } catch (e) {
    // non-fatal - the mini-go handler will surface an error on submit if this failed
  }
}

document.querySelectorAll('.mini-go').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;

    if (action === 'plate') {
      const value = document.getElementById('plate-input').value || '1กข 2345';
      const res = await fetch('/api/plate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      const data = await res.json();
      const el = document.getElementById('plate-result');
      el.innerHTML = `
        <div class="mini-result-text">Plate <strong>${escapeHtml(data.value)}</strong> — overall fortune score ${data.scores.overall}/100</div>
        <div class="ring-row">${ringHtml('Love', data.scores.love)}${ringHtml('Money', data.scores.money)}${ringHtml('Work', data.scores.work)}</div>
      `;
      el.classList.add('show');
    }

    if (action === 'phone') {
      const value = document.getElementById('phone-input').value || '081-234-5678';
      const res = await fetch('/api/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      const data = await res.json();
      const el = document.getElementById('phone-result');
      el.innerHTML = `
        <div class="mini-result-text">Number <strong>${escapeHtml(data.value)}</strong> — overall fortune score ${data.scores.overall}/100</div>
        <div class="ring-row">${ringHtml('Love', data.scores.love)}${ringHtml('Money', data.scores.money)}${ringHtml('Work', data.scores.work)}</div>
      `;
      el.classList.add('show');
    }

    if (action === 'zodiac') {
      const animal = document.getElementById('zodiac-select').value;
      if (!animal) return;
      const res = await fetch('/api/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ animal }) });
      const data = await res.json();
      const el = document.getElementById('zodiac-result');
      el.innerHTML = `
        <div class="mini-result-text"><strong>${data.animal}</strong> — ${data.reading}</div>
        <div class="medallions"><div class="medallion" style="width:44px;height:44px;font-size:14px;">${data.luckyNumber}</div></div>
      `;
      el.classList.add('show');
    }

    if (action === 'name') {
      const name = document.getElementById('name-input').value || 'Somchai';
      const res = await fetch('/api/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      const el = document.getElementById('name-result');
      el.innerHTML = `
        <div class="mini-result-text">"<strong>${escapeHtml(data.name)}</strong>" reduces to power number <strong>${data.power}</strong> — ${escapeHtml(data.meaning)}.</div>
        <div class="medallions"><div class="medallion" style="width:44px;height:44px;font-size:16px;">${data.power}</div></div>
      `;
      el.classList.add('show');
    }

    if (action === 'amulet') {
      const goal = document.getElementById('amulet-select').value;
      if (!goal) return;
      const res = await fetch('/api/amulet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal }) });
      const data = await res.json();
      const el = document.getElementById('amulet-result');
      el.innerHTML = `<div class="mini-result-text">${data.summary}<br><br><em>${data.tip}</em></div>`;
      el.classList.add('show');
    }
  });
});

loadToday();
loadCountdown();
populateZodiacOptions();
