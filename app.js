// ===== Dars Vizual AI — Bosh sahifa logikasi =====

// --- Navigatsiya: hamburger ---
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
}

// --- Dark mode ---
const themeToggle = document.getElementById('themeToggle');
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('dv-theme', t);
}
const savedTheme = localStorage.getItem('dv-theme') || 'light';
applyTheme(savedTheme);
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

// --- Toast ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Panel toggle ---
function togglePanel(id) {
  document.getElementById(id).classList.toggle('open');
}

// --- Statistika animatsiyasi ---
function animateStats() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const statKey = el.dataset.stat;
    const target = statKey
      ? Number(localStorage.getItem(`dv-${statKey}`) || 0)
      : +el.dataset.target;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(timer); }
      el.textContent = cur.toLocaleString('uz');
    }, 25);
  });
}
window.addEventListener('load', animateStats);

function recordStat(statKey) {
  const next = Number(localStorage.getItem(`dv-${statKey}`) || 0) + 1;
  localStorage.setItem(`dv-${statKey}`, String(next));
}

function saveLibraryMaterial(fan, sinf, mavzu, desc, icon = '✨', cover = 'math') {
  const saved = JSON.parse(localStorage.getItem('dv-library-materials') || '[]');
  const material = { id: `ai-${Date.now()}`, fan, sinf, mavzu, desc, icon, cover };
  saved.unshift(material);
  localStorage.setItem('dv-library-materials', JSON.stringify(saved.slice(0, 50)));
  const userId = JSON.parse(localStorage.getItem('dv-profile') || '{}').userId || 'anonymous';
  fetch('/api/saqlanganlar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, fan, sinf, mavzu, desc_text: desc, icon, cover }) }).catch(() => {});
}

// --- API: Savol yaratish ---
async function savolYaratish() {
  const fan = document.getElementById('savolFan').value;
  const sinf = document.getElementById('savolSinf').value;
  const mavzu = document.getElementById('savolMavzu').value.trim();
  const daraja = document.getElementById('savolDaraja').value;
  const natija = document.getElementById('savolNatija');
  const btn = document.getElementById('savolBtn');

  if (!mavzu) { showToast('Iltimos, mavzuni kiriting'); return; }

  btn.disabled = true;
  natija.innerHTML = '<div class="state-box state-loading"><div class="spinner"></div><p>AI dars savolini yaratmoqda...</p></div>';

  try {
    const res = await fetch('/api/savol-yaratish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan, sinf, mavzu, daraja }),
    });
    const data = await res.json();
    if (data.xato) throw new Error(data.xato);
    const content = data.natija || 'Natija topilmadi';
    recordStat('materials');
    recordStat('tests');
    saveLibraryMaterial(fan, sinf, mavzu, content, '❓', 'math');
    natija.innerHTML = `
      <div class="result-box">${escapeHtml(content)}</div>
      <button class="btn btn-ghost btn-sm copy-btn" onclick="copyResult('savol')">📋 Nusxalash</button>
    `;
    natija.dataset.content = content;
  } catch (e) {
    natija.innerHTML = `<div class="state-box state-error">Xatolik: ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

let lastGeneratedImage = null;

// --- API: Rasm yaratish ---
async function rasmYaratish() {
  const fan = document.getElementById('rasmFan').value;
  const sinf = document.getElementById('rasmSinf').value;
  const mavzu = document.getElementById('rasmMavzu').value.trim();
  const rasmTuri = document.getElementById('rasmTuri').value;
  const izoh = document.getElementById('rasmIzoh').value.trim();
  const natija = document.getElementById('rasmNatija');
  const btn = document.getElementById('rasmBtn');

  if (!mavzu) { showToast('Iltimos, mavzuni kiriting'); return; }

  btn.disabled = true;
  natija.innerHTML = '<div class="state-box state-loading"><div class="spinner"></div><p>AI dars rasm promptini yaratmoqda...</p></div>';

  try {
    const res = await fetch('/api/rasm-yaratish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan, sinf, mavzu, rasmTuri, izoh }),
    });
    const data = await res.json();
    if (data.xato) throw new Error(data.xato);
    if (!data.rasm) throw new Error('Rasm ma’lumotlari qaytmadi');
    const content = data.izoh || 'Rasm yaratildi';
    lastGeneratedImage = { fan, sinf, mavzu, desc: content };
    recordStat('materials');
    recordStat('images');
    natija.innerHTML = `<div class="result-box"><img src="${data.rasm}" alt="${escapeHtml(mavzu)}" style="display:block;width:100%;border-radius:12px;margin-bottom:16px;"><div class="image-explanation"><strong>📘 Mavzu izohi</strong><p>${escapeHtml(content)}</p></div><button class="btn btn-accent btn-sm" onclick="saqlashRasm()">💾 Saqlash</button></div>`;
    natija.dataset.content = content;
  } catch (e) {
    natija.innerHTML = `<div class="state-box state-error">Xatolik: ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function saqlashRasm() {
  if (!lastGeneratedImage) return;
  saveLibraryMaterial(lastGeneratedImage.fan, lastGeneratedImage.sinf, lastGeneratedImage.mavzu, lastGeneratedImage.desc, '🎨', 'geo');
  showToast('Rasm Saqlanganlarga qo\'shildi');
}

// --- Yordamchi ---
function copyResult(type) {
  const el = document.getElementById(type === 'savol' ? 'savolNatija' : 'rasmNatija');
  const text = el.dataset.content || '';
  navigator.clipboard.writeText(text).then(() => showToast('Nusxalandi!'));
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
