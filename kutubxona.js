// ===== Kutubxona logikasi =====

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

const themeToggle = document.getElementById('themeToggle');
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  if (themeToggle) themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('dv-theme', t);
}
applyTheme(localStorage.getItem('dv-theme') || 'light');
if (themeToggle) themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Standart materiallar ---
const materials = [
  { id:1, fan:'Matematika', mavzu:'Algebrik ifodalar', sinf:'7-sinf', icon:'🔢', cover:'math', desc:'Son, o\'zgaruvchi va algebrik ifodalar tushunchasi.' },
  { id:2, fan:'Matematika', mavzu:'Chiziqli tenglamalar', sinf:'8-sinf', icon:'📐', cover:'math', desc:'Bir noma\'lumli chiziqli tenglamalarni yechish.' },
  { id:3, fan:'Fizika', mavzu:'Harakat va tezlik', sinf:'7-sinf', icon:'⚡', cover:'phys', desc:'Birtekis harakat, tezlik va yo\'l formulaslari.' },
  { id:4, fan:'Fizika', mavzu:'Elektr toki', sinf:'8-sinf', icon:'💡', cover:'phys', desc:'Elektr zanjiri, kuchlanish va qarshilik.' },
  { id:5, fan:'Kimyo', mavzu:'Atom tuzilishi', sinf:'7-sinf', icon:'🧪', cover:'chem', desc:'Atom, proton, neutron va elektronlar haqida.' },
  { id:6, fan:'Kimyo', mavzu:'Davriy sistemA', sinf:'8-sinf', icon:'⚗️', cover:'chem', desc:'Mendeleyev davriy sistemasi va elementlar.' },
  { id:7, fan:'Biologiya', mavzu:'Hujayra', sinf:'7-sinf', icon:'🧬', cover:'bio', desc:'Hujayra tuzilishi va organoidlari.' },
  { id:8, fan:'Biologiya', mavzu:'Fotosintez', sinf:'8-sinf', icon:'🌱', cover:'bio', desc:'O\'simliklarda yorug\'lik energiyasi sintezi.' },
  { id:9, fan:'Geografiya', mavzu:'Qit\'alar va okeanlar', sinf:'7-sinf', icon:'🌍', cover:'geo', desc:'Yer qit\'alari va okeanlari haqida.' },
  { id:10, fan:'Geografiya', mavzu:'Iqlim va ob-havo', sinf:'8-sinf', icon:'🌤️', cover:'geo', desc:'Iqlim mintaqalari va ob-havo omillari.' },
  { id:11, fan:'Tarix', mavzu:'O\'rta asrlar', sinf:'7-sinf', icon:'📜', cover:'hist', desc:'O\'rta asrlar davri va uning xususiyatlari.' },
  { id:12, fan:'Tarix', mavzu:'Mustaqillik davri', sinf:'8-sinf', icon:'🏛️', cover:'hist', desc:'O\'zbekiston mustaqillikka erishi jarayoni.' },
];

// AI orqali yaratilgan materiallar ham kutubxonada saqlanadi.
const savedMaterials = JSON.parse(localStorage.getItem('dv-library-materials') || '[]');
// Faqat foydalanuvchi saqlagan materiallar ko'rsatiladi.
const allMaterials = savedMaterials;

async function loadCloudMaterials() {
  try {
    const userId = JSON.parse(localStorage.getItem('dv-profile') || '{}').userId || 'anonymous';
    const response = await fetch(`/api/saqlanganlar?user_id=${encodeURIComponent(userId)}`);
    const data = await response.json();
    if (Array.isArray(data.materials)) {
      allMaterials.splice(0, allMaterials.length, ...data.materials.map(m => ({ id: m.id, fan: m.fan, sinf: m.sinf, mavzu: m.mavzu, desc: m.desc_text || '', icon: m.icon || '💾', cover: m.cover || 'math' })));
      renderMaterials();
    }
  } catch {}
}

let activeCat = 'all';
let searchTerm = '';

function renderMaterials() {
  const grid = document.getElementById('libGrid');
  const empty = document.getElementById('libEmpty');
  const count = document.getElementById('libCount');

  let filtered = allMaterials;
  if (activeCat !== 'all') filtered = filtered.filter(m => m.fan === activeCat);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(m =>
      m.mavzu.toLowerCase().includes(q) ||
      m.fan.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q)
    );
  }

  count.textContent = `${filtered.length} ta material`;
  grid.innerHTML = '';

  if (!filtered.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  filtered.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'lib-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.classList.add('fade-in-up');
    card.innerHTML = `
      <div class="lib-card-cover ${m.cover}">${m.icon}</div>
      <div class="lib-card-body">
        <h4>${escapeHtml(m.mavzu)}</h4>
        <p>${escapeHtml(m.desc)}</p>
        <div class="lib-card-meta">
          <span class="badge badge-primary">${escapeHtml(m.fan)}</span>
          <span>${escapeHtml(m.sinf)}</span>
          <button class="delete-material" data-material-id="${m.id}" title="O‘chirish">🗑️</button>
        </div>
      </div>
    `;
    card.onclick = () => showToast(`${m.mavzu} — tez orada to'liq versiya!`);
    grid.appendChild(card);
  });
}

// Kategoriyalar
document.querySelectorAll('.cat-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    renderMaterials();
  });
});

// Qidiruv
document.getElementById('libSearch').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim();
  renderMaterials();
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

renderMaterials();
loadCloudMaterials();

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.delete-material');
  if (!button) return;
  event.stopPropagation();
  const material = allMaterials.find((item) => String(item.id) === String(button.dataset.materialId));
  const userId = JSON.parse(localStorage.getItem('dv-profile') || '{}').userId;
  if (!material) return;
  if (!userId || String(material.id).startsWith('ai-')) { allMaterials.splice(allMaterials.indexOf(material), 1); renderMaterials(); return; }
  const response = await fetch(`/api/saqlanganlar/${encodeURIComponent(material.id)}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!response.ok) return showToast('O‘chirishda xatolik yuz berdi');
  allMaterials.splice(allMaterials.indexOf(material), 1); renderMaterials(); showToast('Material o‘chirildi');
});
