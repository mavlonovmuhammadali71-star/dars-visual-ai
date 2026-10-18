// ===== Slaydlar sahifasi logikasi =====

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

// Uslub tanlash
let selectedUslub = 'aniq';
document.querySelectorAll('.uslub-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.uslub-pill').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedUslub = btn.dataset.value;
  });
});

// Slayd holati
let slaydlar = [];
let currentSlide = 0;

async function slaydYaratish() {
  const fan = document.getElementById('slaydFan').value;
  const sinf = document.getElementById('slaydSinf').value;
  const mavzu = document.getElementById('slaydMavzu').value.trim();
  const slaydSon = document.getElementById('slaydSon').value;
  const status = document.getElementById('setupStatus');
  const btn = document.getElementById('genBtn');

  if (!mavzu) { showToast('Iltimos, mavzuni kiriting'); return; }

  btn.disabled = true;
  status.innerHTML = '<div class="state-box state-loading"><div class="spinner"></div><p>AI dars slaydlarini yaratmoqda...</p></div>';

  try {
    const res = await fetch('/api/slayd-yaratish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan, sinf, mavzu, slaydSon, uslub: selectedUslub }),
    });
    const data = await res.json();
    if (data.xato) throw new Error(data.xato);
    if (!data.slaydlar || !data.slaydlar.length) throw new Error('Slaydlar yaratilmadi');

    slaydlar = data.slaydlar;
    localStorage.setItem('dv-materials', String(Number(localStorage.getItem('dv-materials') || 0) + 1));
    localStorage.setItem('dv-slides', String(Number(localStorage.getItem('dv-slides') || 0) + 1));
    currentSlide = 0;

    document.getElementById('setupPanel').style.display = 'none';
    document.getElementById('viewerPanel').style.display = 'block';
    renderSlide();
    renderThumbs();
    showToast(`${slaydlar.length} ta slayd yaratildi!`);
  } catch (e) {
    status.innerHTML = `<div class="state-box state-error">Xatolik: ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderSlide() {
  if (!slaydlar.length) return;
  const s = slaydlar[currentSlide];
  const card = document.getElementById('slideCard');

  card.classList.remove('slide-anim-in');
  void card.offsetWidth;
  card.classList.add('slide-anim-in');

  document.getElementById('slideNumber').textContent = currentSlide + 1;
  document.getElementById('slideTitle').textContent = s.sarlavha || s.title || 'Slayd';

  const contentEl = document.getElementById('slideContent');
  const kontent = s.kontent || s.content || '';
  const lines = kontent.split('\n').filter(l => l.trim());
  if (lines.length > 1) {
    contentEl.innerHTML = lines.map(l => `<div class="bullet">${escapeHtml(l.replace(/^[•\-*\d+\.\)]\s*/, ''))}</div>`).join('');
  } else {
    contentEl.textContent = kontent;
  }

  const noteEl = document.getElementById('slideNote');
  const izoh = s.izoh || s.note || '';
  if (izoh) {
    noteEl.innerHTML = `<strong>👨‍🏫 O'qituvchi uchun:</strong> ${escapeHtml(izoh)}`;
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }

  document.getElementById('slideCounter').textContent = `${currentSlide + 1} / ${slaydlar.length}`;
  document.getElementById('prevBtn').disabled = currentSlide === 0;
  document.getElementById('nextBtn').disabled = currentSlide === slaydlar.length - 1;

  renderThumbs();
}

function oldingiSlayd() {
  if (currentSlide > 0) {
    currentSlide--;
    renderSlide();
  }
}

function keyingiSlayd() {
  if (currentSlide < slaydlar.length - 1) {
    currentSlide++;
    renderSlide();
  }
}

function renderThumbs() {
  const container = document.getElementById('slideThumbs');
  container.innerHTML = '';
  slaydlar.forEach((s, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'slide-thumb' + (i === currentSlide ? ' active' : '');
    thumb.innerHTML = `
      <span class="thumb-num">${i + 1}</span>
      <div class="thumb-title">${escapeHtml(s.sarlavha || s.title || 'Slayd ' + (i+1))}</div>
      <div class="thumb-bar"></div>
    `;
    thumb.onclick = () => {
      currentSlide = i;
      renderSlide();
    };
    container.appendChild(thumb);
  });
}

function ortgaQaytish() {
  document.getElementById('viewerPanel').style.display = 'none';
  document.getElementById('setupPanel').style.display = 'block';
  document.getElementById('setupStatus').innerHTML = '';
}

function saqlashSlaydlar() {
  if (!slaydlar.length) return;
  const saved = JSON.parse(localStorage.getItem('dv-library-materials') || '[]');
  const fan = document.getElementById('slaydFan').value;
  const sinf = document.getElementById('slaydSinf').value;
  const mavzu = document.getElementById('slaydMavzu').value.trim();
  saved.unshift({ id: `ai-${Date.now()}`, fan, sinf, mavzu, desc: `${slaydlar.length} ta slayd saqlandi`, icon: '📊', cover: 'math' });
  localStorage.setItem('dv-library-materials', JSON.stringify(saved.slice(0, 50)));
  const userId = JSON.parse(localStorage.getItem('dv-profile') || '{}').userId || 'anonymous';
  fetch('/api/saqlanganlar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, fan, sinf, mavzu, desc_text: `${slaydlar.length} ta slayd saqlandi`, icon: '📊', cover: 'math' }) }).catch(() => {});
  showToast('Slaydlar Saqlanganlarga qo\'shildi');
}

function yuklabOlish() {
  if (!slaydlar.length) return;
  let text = `DARS PREZENTATSIYASI\n${'='.repeat(40)}\n\n`;
  slaydlar.forEach((s, i) => {
    text += `\nSLAYD ${i + 1}: ${s.sarlavha || s.title || ''}\n${'-'.repeat(30)}\n`;
    text += `${s.kontent || s.content || ''}\n`;
    if (s.izoh || s.note) {
      text += `\nO'qituvchi uchun: ${s.izoh || s.note}\n`;
    }
  });
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dars-slaydlar-${Date.now()}.txt`;
  a.click();
  showToast('Slaydlar yuklab olindi!');
}

// Klaviatura navigatsiyasi
document.addEventListener('keydown', (e) => {
  if (document.getElementById('viewerPanel').style.display === 'none') return;
  if (e.key === 'ArrowRight') keyingiSlayd();
  if (e.key === 'ArrowLeft') oldingiSlayd();
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
