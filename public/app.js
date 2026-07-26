const authArea = document.getElementById('auth-area');
const loginBtn = document.getElementById('login-btn');
const loginHint = document.getElementById('login-hint');
const dreamInput = document.getElementById('dream-input');
const revealBtn = document.getElementById('reveal-btn');
const resultCard = document.getElementById('result-card');
const footerDraw = document.getElementById('footer-draw');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

let currentUser = null;
let isGuestUser = true;
let lineLoginAvailable = true;

async function loadMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  currentUser = data.user;
  isGuestUser = data.isGuest;
  lineLoginAvailable = data.lineLoginAvailable;
  renderAuthArea();
  maybeShowLineComingSoonNotice();
}

function maybeShowLineComingSoonNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lineComingSoon') === '1') {
    loginHint.textContent = 'LINE sign-in is launching soon — for now you\'re browsing as a guest, and your personal number and Draw Pass still work normally.';
    loginHint.classList.remove('hidden');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function renderAuthArea() {
  if (currentUser && !isGuestUser) {
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
  const { matched, readings, personalNumber, hasUnlock, pendingManual, paymentsAvailable, draw, pricing } = data;

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
    : pendingManual
    ? `<div class="paywall"><p>✓ Payment submitted — we'll confirm it shortly and your numbers will unlock automatically.</p></div>`
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

  if (data.manual) {
    const qrPanel = document.getElementById('qr-panel');
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.classList.add('hidden');
    qrPanel.classList.remove('hidden');
    qrPanel.innerHTML = `
      <p><strong>Step 1</strong> — Scan to pay ${(data.amountSatang / 100).toFixed(0)} THB via PromptPay</p>
      <img src="${data.qrImageUrl}" alt="PromptPay QR code">
      ${data.contactQrImageUrl ? `
        <p style="margin-top:14px;"><strong>Step 2</strong> — ${escapeHtml(data.contactInfo)}</p>
        <img src="${data.contactQrImageUrl}" alt="LINE contact QR code">
      ` : `<p style="margin-top:8px;">${escapeHtml(data.contactInfo)}</p>`}
      <input type="text" id="payer-note" placeholder="Your name (optional, helps us find your payment)" style="width:100%;max-width:300px;padding:8px;border-radius:8px;border:1px solid rgba(201,162,39,0.3);margin:10px 0;background:rgba(244,233,208,0.06);color:var(--parchment);">
      <br>
      <button class="unlock-btn" id="ive-paid-btn">I've paid</button>
      <p id="claim-status" style="margin-top:8px;"></p>
    `;
    document.getElementById('ive-paid-btn').addEventListener('click', submitManualClaim);
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

async function submitManualClaim() {
  const btn = document.getElementById('ive-paid-btn');
  const noteInput = document.getElementById('payer-note');
  const statusEl = document.getElementById('claim-status');
  btn.disabled = true;

  const res = await fetch('/api/unlock/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payerNote: noteInput ? noteInput.value : '' }),
  });
  const data = await res.json();

  if (data.submitted || data.alreadySubmitted) {
    statusEl.textContent = "✓ Submitted! We'll confirm it shortly and unlock your numbers automatically.";
  } else if (data.alreadyUnlocked) {
    statusEl.textContent = 'Already unlocked ✨';
  } else {
    statusEl.textContent = 'Something went wrong — please try again.';
    btn.disabled = false;
  }
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
  const select = document.getElementById('zodiac-select');
  if (!select) return;
  try {
    const res = await fetch('/api/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    const options = data.options || [];
    select.innerHTML = '<option value="">Choose your year animal...</option>' + options.map((a) => `<option>${a}</option>`).join('');
  } catch (e) {}
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
      el.innerHTML = `
        <div class="mini-result-text">${data.summary}<br><br><em>${data.tip}</em></div>
        <a href="#shop" class="try-btn" style="display:block;text-decoration:none;text-align:center;box-sizing:border-box;" onclick="highlightShopCategory('${data.goal}')">Shop this type →</a>
      `;
      el.classList.add('show');
    }
  });
});

loadToday();
loadCountdown();
populateZodiacOptions();

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-dreams').textContent = data.dreamsToday;
    document.getElementById('stat-unlocks').textContent = data.unlocksToday;
  } catch (e) {}
}

async function loadStatsDrawDays() {
  try {
    const res = await fetch('/api/draw');
    const draw = await res.json();
    document.getElementById('stat-days').textContent = draw.isToday ? '0' : draw.daysAway;
  } catch (e) {}
}

const products = [
  { id:'kumarn', icon:'🧿', name:'Kumarn Thong', category:'wealth', desc:'Traditional wealth-drawing amulet, believed to bring prosperity to its keeper.', price:590 },
  { id:'jatukam', icon:'🪙', name:'Jatukam Ramathep', category:'wealth', desc:'Well-known protective and prosperity amulet, popular across Thailand.', price:890 },
  { id:'saisin', icon:'🧵', name:'Blessed Thread Bracelet', category:'protection', desc:'Sai sin cotton thread bracelet, blessed by monks for protection.', price:190 },
  { id:'buddha', icon:'☸️', name:'Buddha Pendant', category:'protection', desc:'Small pendant necklace for everyday protection and peace of mind.', price:450 },
  { id:'moneytree', icon:'🪴', name:'Lucky Money Tree', category:'wealth', desc:'Pachira plant, traditionally kept in homes and offices for prosperity.', price:350 },
  { id:'lovecharm', icon:'💗', name:'Love & Relationship Charm', category:'love', desc:'A small charm traditionally worn close to the heart.', price:290 },
  { id:'incense', icon:'🕯️', name:'Blessed Incense Set', category:'protection', desc:'Traditional incense set for home altars and daily merit-making.', price:120 },
  { id:'careercharm', icon:'📈', name:'Career Success Charm', category:'career', desc:'Worn for promotion luck, often paired with your day-color.', price:320 },
];

function renderShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = products.map((p) => `
    <div class="product-card" id="product-${p.id}" data-category="${p.category}">
      <div class="product-image">${p.icon}</div>
      <span class="product-tag">${p.category}</span>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.desc)}</p>
      <div class="product-footer">
        <div class="product-price">${p.price} THB</div>
        <button class="buy-btn" data-product="${p.id}">Buy</button>
      </div>
      <div class="checkout-panel" id="checkout-${p.id}"></div>
    </div>
  `).join('');

  grid.querySelectorAll('.buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => startShopCheckout(btn.dataset.product));
  });
}

async function startShopCheckout(productId) {
  const panel = document.getElementById(`checkout-${productId}`);
  const btn = document.querySelector(`.buy-btn[data-product="${productId}"]`);
  panel.classList.add('open');
  panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">Loading...</p>`;

  const res = await fetch('/api/shop/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  const data = await res.json();

  if (data.comingSoon) {
    panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">${escapeHtml(data.message)}</p>`;
    return;
  }
  if (data.error) {
    panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">Something went wrong — please try again.</p>`;
    return;
  }

  btn.disabled = true;
  panel.innerHTML = `
    <p style="font-size:12px;text-align:center;"><strong>Step 1</strong> — Scan to pay ${(data.priceSatang / 100).toFixed(0)} THB via PromptPay</p>
    <img src="${data.qrImageUrl}" alt="PromptPay QR code" style="width:160px;height:160px;margin:8px auto;display:block;border-radius:12px;">
    ${data.contactQrImageUrl ? `
      <p style="font-size:12px;text-align:center;margin-top:10px;"><strong>Step 2</strong> — ${escapeHtml(data.contactInfo)}</p>
      <img src="${data.contactQrImageUrl}" alt="LINE contact QR code" style="width:160px;height:160px;margin:8px auto;display:block;border-radius:12px;">
    ` : `<p style="font-size:12px;text-align:center;">${escapeHtml(data.contactInfo)}</p>`}
    <input type="text" id="order-note-${productId}" placeholder="Your name or preferences (optional)" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(201,162,39,0.3);margin:10px 0;background:rgba(244,233,208,0.06);color:var(--parchment);box-sizing:border-box;">
    <button class="unlock-btn" id="order-paid-btn-${productId}" style="width:100%;">I've paid</button>
    <p id="order-status-${productId}" style="font-size:12px;text-align:center;margin-top:8px;"></p>
  `;

  document.getElementById(`order-paid-btn-${productId}`).addEventListener('click', () => submitShopOrder(productId));
}

async function submitShopOrder(productId) {
  const btn = document.getElementById(`order-paid-btn-${productId}`);
  const noteInput = document.getElementById(`order-note-${productId}`);
  const statusEl = document.getElementById(`order-status-${productId}`);
  btn.disabled = true;

  const res = await fetch('/api/shop/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, payerNote: noteInput ? noteInput.value : '' }),
  });
  const data = await res.json();

  if (data.submitted) {
    statusEl.textContent = "✓ Got it! We'll find the right one for you personally and message you on LINE to confirm details.";
  } else {
    statusEl.textContent = 'Something went wrong — please try again.';
    btn.disabled = false;
  }
}

function highlightShopCategory(category) {
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach((card) => {
      card.style.borderColor = card.dataset.category === category ? 'rgba(201,162,39,0.8)' : '';
    });
  }, 200);
}

async function loadTrends() {
  try {
    const res = await fetch('/api/trends');
    const data = await res.json();
    const list = document.getElementById('trend-list');
    if (!data.trends || data.trends.length === 0) return;

    const max = Math.max(...data.trends.map((t) => t.count));
    list.innerHTML = data.trends.map((t, i) => `
      <div class="trend-row">
        <div class="trend-num">${i + 1}</div>
        <div style="width:130px;font-size:12.5px;">${t.emoji} ${escapeHtml(t.label)}</div>
        <div class="trend-bar-track"><div class="trend-bar-fill" style="width:${((t.count / max) * 100).toFixed(0)}%"></div></div>
        <div class="trend-count">${t.count} read${t.count === 1 ? '' : 's'}</div>
      </div>
    `).join('');
  } catch (e) {}
}

const temples = [
  {
    icon:'🐍', name:'Kham Chanod (Wang Nakhin)', province:'Udon Thani', rating:'4.6★ (15k+ reviews)',
    desc:'A palm-covered site believed to be a gateway to the naga realm. Visitors light incense, circle the sacred trees, and watch candle wax drip into water for number signs.',
    mapsUrl:'https://maps.google.com/?cid=14783424111115046286'
  },
  {
    icon:'🐓', name:'Wat Chedi (Ai Khai)', province:'Nakhon Si Thammarat', rating:'4.6★ (12k+ reviews)',
    desc:'One of Thailand\'s most famous Government Lottery pilgrimage sites, devoted to child-spirit guardian Ai Khai.',
    mapsUrl:'https://maps.google.com/?cid=13667418601365559692'
  },
  {
    icon:'🐢', name:'Phaya Tao Ngoi Shrine', province:'Sakon Nakhon', rating:'4.3★ (5k+ reviews)',
    desc:'A giant turtle statue tied to local legends of longevity and windfall luck.',
    mapsUrl:'https://maps.google.com/?cid=13818307400563680921'
  },
  {
    icon:'🌳', name:'Wat Prasat', province:'Nonthaburi (Greater Bangkok)', rating:'4.7★ (2.9k+ reviews)',
    desc:'A 400-year-old temple, home to the Nang Ta-khian tree-spirit shrine — a favorite among Government Lottery hopefuls close to Bangkok.',
    mapsUrl:'https://maps.google.com/?cid=6446611963925743651'
  },
  {
    icon:'🏔️', name:'Naga Cave (Tham Naka)', province:'Bueng Kan', rating:'4.8★ (3k+ reviews)',
    desc:'Serpentine rock formations high in Phu Langka National Park that went viral for resembling a sleeping naga.',
    mapsUrl:'https://maps.google.com/?cid=12811720373151630818'
  },
];

function renderTemples() {
  const grid = document.getElementById('temple-grid');
  if (!grid) return;
  grid.innerHTML = temples.map((t) => `
    <div class="temple-card">
      <div class="temple-icon">${t.icon}</div>
      <div class="temple-body">
        <div class="temple-header">
          <h3>${escapeHtml(t.name)}</h3>
          <span class="temple-province">${escapeHtml(t.province)}</span>
          <span class="temple-rating">${t.rating}</span>
        </div>
        <p>${t.desc}</p>
        <a href="${t.mapsUrl}" target="_blank" rel="noopener" class="temple-link">Open in Google Maps →</a>
      </div>
    </div>
  `).join('') + `<p class="temple-disclaimer">These are real, documented pilgrimage sites — included here as cultural context, not as a claim that visiting predicts Government Lottery outcomes.</p>`;
}

async function loadSymbolGrid() {
  const grid = document.getElementById('symbol-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/dream/symbols');
    const data = await res.json();
    grid.innerHTML = data.symbols
      .map(
        (s) =>
          `<button class="symbol-chip" data-keyword="${escapeHtml(s.keyword)}"><span class="emoji">${s.emoji}</span>${escapeHtml(s.label)}</button>`
      )
      .join('');

    grid.querySelectorAll('.symbol-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        dreamInput.value = chip.dataset.keyword;
        revealDream(chip.dataset.keyword);
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  } catch (e) {}
}

loadStats();
loadStatsDrawDays();
renderShop();
loadTrends();
renderTemples();
loadSymbolGrid();