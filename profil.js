// ===== Profil logikasi =====

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

const themeToggle = document.getElementById('themeToggle');
let supabaseClient = null;

async function setupSupabaseAuth() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) return;
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await supabaseClient.auth.getUser();
    if (data.user) {
      const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'O\'qituvchi';
      const profile = JSON.parse(localStorage.getItem('dv-profile') || '{}');
      profile.name = name;
      profile.email = data.user.email || profile.email;
      profile.userId = data.user.id;
      localStorage.setItem('dv-profile', JSON.stringify(profile));
      loadProfile();
      document.getElementById('googleLoginBtn').textContent = '✅ Google orqali kirdingiz';
    }
  } catch (error) { console.warn('Supabase Auth sozlanmadi', error); showToast('Google login ulanishida xatolik'); }
}

async function loginWithGoogle() {
  return showToast('Google orqali ro‘yxatdan o‘tish vaqtincha o‘chirilgan');
  /*
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const redirectTo = isLocal
    ? `${window.location.origin}/profil.html`
    : 'https://dars-visual-ai.onrender.com/profil.html';
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) showToast(`Kirish xatosi: ${error.message}`);
  */
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  if (themeToggle) themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('dv-theme', t);
  const st = document.getElementById('settingTheme');
  if (st) st.textContent = t === 'dark' ? 'O\'chirish' : 'Yoqish';
}
applyTheme(localStorage.getItem('dv-theme') || 'light');
if (themeToggle) themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

function toggleThemeSetting() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Profil ma'lumotlari ---
function loadProfile() {
  const p = JSON.parse(localStorage.getItem('dv-profile') || '{}');
  const name = p.name || 'O\'qituvchi';
  const email = p.email || 'oqituvchi@darsvizual.uz';
  document.getElementById('profName').textContent = name;
  document.getElementById('profEmail').textContent = email;
  document.getElementById('profAvatar').textContent = name.charAt(0).toUpperCase();
  if (p.avatar) {
    document.getElementById('profAvatar').innerHTML = `<img src="${p.avatar}" alt="Profil rasmi">`;
  }
  document.getElementById('settingName').value = name;
  document.getElementById('editName').value = name;
  document.getElementById('editEmail').value = email;
}

function uploadAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Rasm hajmi 2 MB dan kichik bo\'lishi kerak');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const p = JSON.parse(localStorage.getItem('dv-profile') || '{}');
    p.avatar = reader.result;
    localStorage.setItem('dv-profile', JSON.stringify(p));
    loadProfile();
    showToast('Profil rasmi saqlandi');
  };
  reader.readAsDataURL(file);
}

function toggleEdit() {
  const m = document.getElementById('editModal');
  m.style.display = m.style.display === 'none' ? 'grid' : 'none';
}

function saveProfile() {
  const name = document.getElementById('editName').value.trim() || 'O\'qituvchi';
  const email = document.getElementById('editEmail').value.trim() || 'oqituvchi@darsvizual.uz';
  localStorage.setItem('dv-profile', JSON.stringify({ name, email }));
  loadProfile();
  toggleEdit();
  showToast('Profil saqlandi');
}

function saveSettings() {
  const name = document.getElementById('settingName').value.trim() || 'O\'qituvchi';
  const p = JSON.parse(localStorage.getItem('dv-profile') || '{}');
  p.name = name;
  localStorage.setItem('dv-profile', JSON.stringify(p));
  loadProfile();
  showToast('Sozlamalar saqlandi');
}

// --- Natijalar ---
function loadStats() {
  const results = JSON.parse(localStorage.getItem('dv-results') || '[]');
  const totalImages = Number(localStorage.getItem('dv-images') || 0);
  const totalSlides = Number(localStorage.getItem('dv-slides') || 0);
  const totalBall = results.reduce((s, r) => s + r.ball, 0);
  const totalTogri = results.reduce((s, r) => s + r.togri, 0);
  const races = results.length;

  document.getElementById('psBall').textContent = totalImages;
  document.getElementById('psRaces').textContent = totalSlides;
  return;

  // Natijalar ro'yxati
  const list = document.getElementById('resultsList');
  const empty = document.getElementById('resultsEmpty');
  list.innerHTML = '';
  if (!results.length) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    results.slice(0, 10).forEach(r => {
      const row = document.createElement('div');
      row.className = 'result-row fade-in-up';
      const date = new Date(r.sana).toLocaleDateString('uz');
      row.innerHTML = `
        <div class="rr-icon">🏁</div>
        <div class="rr-info">
          <strong>${escapeHtml(r.fan)} — ${escapeHtml(r.mavzu)}</strong>
          <small>${r.togri}/${r.total} to'g'ri · ${r.vaqt}s · ${date}</small>
        </div>
        <div class="rr-score">${r.ball}</div>
      `;
      list.appendChild(row);
    });
  }

  // Yutuqlar
  renderAchievements(totalBall, races, totalTogri);
}

function calcStreak(results) {
  if (!results.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toDateString();
    const has = results.some(r => new Date(r.sana).toDateString() === dStr);
    if (has) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// --- Yutuqlar ---
const achievements = [
  { id: 'first', icon: '🎯', title: 'Birinchi dars', desc: 'Birinchi poynga darsi', cond: r => r.races >= 1 },
  { id: 'five', icon: '🔥', title: 'Faol o\'qituvchi', desc: '5 ta dars poyngasi', cond: r => r.races >= 5 },
  { id: 'ten', icon: '⭐', title: 'Veteran', desc: '10 ta dars poyngasi', cond: r => r.races >= 10 },
  { id: 'score500', icon: '💎', title: 'Ball to\'plovchi', desc: '500 ball', cond: r => r.totalBall >= 500 },
  { id: 'score1000', icon: '👑', title: 'Champion', desc: '1000 ball', cond: r => r.totalBall >= 1000 },
  { id: 'perfect', icon: '🏅', title: 'Mukammal', desc: 'Hammasi to\'g\'ri', cond: r => r.results.some(x => x.togri === x.total) },
  { id: 'streak3', icon: '⚡', title: 'Ketma-ket 3', desc: '3 kun ketma-ket', cond: r => calcStreak(r.results) >= 3 },
  { id: 'smart', icon: '🧠', title: 'Aqlli o\'qituvchi', desc: '50 to\'g\'ri javob', cond: r => r.totalTogri >= 50 },
];

function renderAchievements(totalBall, races, totalTogri) {
  const results = JSON.parse(localStorage.getItem('dv-results') || '[]');
  const ctx = { totalBall, races, totalTogri, results };
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = '';
  achievements.forEach(a => {
    const unlocked = a.cond(ctx);
    const el = document.createElement('div');
    el.className = 'achievement' + (unlocked ? '' : ' locked');
    el.innerHTML = `<div class="ach-icon">${a.icon}</div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div>`;
    grid.appendChild(el);
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

loadProfile();
loadStats();
setupSupabaseAuth();
if (window.location.hash === '#google-login') setTimeout(() => document.getElementById('googleLoginBtn')?.click(), 500);
