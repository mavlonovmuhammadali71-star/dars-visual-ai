// ===== Dars Race — o'yin logikasi =====

// --- Nav + theme (global) ---
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

// --- Option selection ---
let raceState = { fan: null, sinf: null, mavzu: '', daraja: null, son: null };
let gameData = { players: [[], []], idx: [0, 0], distance: [0, 0], togri: [0, 0], answered: [false, false], startTime: 0, timer: null };

function setupOptionGroup(groupId, key) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      raceState[key] = btn.dataset.value;
    });
  });
}
setupOptionGroup('fanGrid', 'fan');
setupOptionGroup('sinfRow', 'sinf');
setupOptionGroup('darajaRow', 'daraja');
setupOptionGroup('sonRow', 'son');

// --- Start race ---
async function startRace() {
  raceState.mavzu = document.getElementById('raceMavzu').value.trim();
  const status = document.getElementById('setupStatus');

  if (!raceState.fan) { showToast('Fan tanlang'); return; }
  if (!raceState.sinf) { showToast('Sinf tanlang'); return; }
  if (!raceState.mavzu) { showToast('Mavzuni kiriting'); return; }
  if (!raceState.daraja) { showToast('Qiyinlik darajasini tanlang'); return; }
  if (!raceState.son) { showToast('Savollar sonini tanlang'); return; }

  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  status.innerHTML = '<div class="state-box state-loading"><div class="spinner"></div><p>AI dars savollarini yaratmoqda...</p></div>';

  try {
    const res = await fetch('/api/poyga-savollari', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...raceState, son: Number(raceState.son) * 2 }),
    });
    const data = await res.json();
    if (data.xato) throw new Error(data.xato);
    if (!data.savollar || data.savollar.length < 2) throw new Error('Savollar yaratilmadi');

    const half = Math.ceil(data.savollar.length / 2);
    gameData.players = [data.savollar.slice(0, half), data.savollar.slice(half)];
    localStorage.setItem('dv-tests', String(Number(localStorage.getItem('dv-tests') || 0) + 1));
    gameData.idx = [0, 0];
    gameData.distance = [0, 0];
    gameData.togri = [0, 0];
    gameData.answered = [false, false];
    gameData.startTime = Date.now();

    document.getElementById('setupPanel').style.display = 'none';
    document.getElementById('gamePanel').style.display = 'block';
    startTimer();
    showQuestion();
  } catch (e) {
    status.innerHTML = `<div class="state-box state-error">Xatolik: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function startTimer() {
  if (gameData.timer) clearInterval(gameData.timer);
  gameData.timer = setInterval(() => {
    const sec = Math.floor((Date.now() - gameData.startTime) / 1000);
    document.getElementById('hudVaqt').textContent = `⏱ ${sec}s`;
  }, 500);
}

function showQuestion() {
  [0, 1].forEach(player => renderPlayerQuestion(player));

  updateTrack();
}

function renderPlayerQuestion(player) {
  const s = gameData.players[player][gameData.idx[player]];
  if (!s) return;
  gameData.answered[player] = false;
  const total = gameData.players[player].length;
  document.getElementById(`qProgressBar${player + 1}`).style.width = `${(gameData.idx[player] / total) * 100}%`;
  document.getElementById(`qText${player + 1}`).textContent = s.savol || s.question || 'Savol';
  const variants = document.getElementById(`qVariants${player + 1}`);
  variants.innerHTML = '';
  ['A','B','C','D'].forEach((letter, i) => {
    const v = (s.variantlar || s.options || [])[i];
    if (v === undefined) return;
    const btn = document.createElement('button');
    btn.className = 'q-variant';
    btn.innerHTML = `<span class="v-letter">${letter}</span><span>${escapeHtml(v)}</span>`;
    btn.onclick = () => answerQuestion(player, i, btn);
    variants.appendChild(btn);
  });
}

function answerQuestion(player, choice) {
  if (gameData.answered[player]) return;
  gameData.answered[player] = true;

  const s = gameData.players[player][gameData.idx[player]];
  const correctIdx = s.togri ?? s.correct ?? 0;
  const allBtns = document.querySelectorAll(`#qVariants${player + 1} .q-variant`);

  allBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIdx) b.classList.add('correct');
    if (i === choice && i !== correctIdx) b.classList.add('wrong');
  });

  if (choice === correctIdx) {
    gameData.togri[player]++;
    gameData.distance[player] += 25;
    showToast(`${player + 1}-ishtirokchi: To'g'ri!`);
  } else {
    gameData.distance[player] = Math.max(0, gameData.distance[player] - 5);
    showToast(`${player + 1}-ishtirokchi: Noto'g'ri javob`);
  }
  gameData.idx[player]++;
  if (gameData.distance[player] >= 100) return endRace(player);
  if (gameData.idx[0] >= gameData.players[0].length && gameData.idx[1] >= gameData.players[1].length) {
    const winner = gameData.distance[0] === gameData.distance[1] ? null : (gameData.distance[0] > gameData.distance[1] ? 0 : 1);
    return endRace(winner);
  }
  document.getElementById(`hudBall${player + 1}`).textContent = `${gameData.distance[player]} m`;
  updateTrack();
  setTimeout(() => renderPlayerQuestion(player), 500);
}

function updateTrack() {
  document.getElementById('carPlayer').style.left = `${Math.min(90, gameData.distance[0] * 0.9)}%`;
  document.getElementById('carBot').style.left = `${Math.min(90, gameData.distance[1] * 0.9)}%`;
}

function endRace(winner = null) {
  if (gameData.timer) clearInterval(gameData.timer);
  const sec = Math.floor((Date.now() - gameData.startTime) / 1000);
  const total = gameData.players[0].length;

  document.getElementById('gamePanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display = 'block';

  document.getElementById('rsBall').textContent = winner === null ? 'Teng' : `${winner + 1}-ishtirokchi`;
  document.getElementById('rsTogri').textContent = `${gameData.togri[0]} - ${gameData.togri[1]}`;
  document.getElementById('rsVaqt').textContent = `${sec}s`;

  const trophy = document.getElementById('resultsTrophy');
  const title = document.getElementById('resultsTitle');
  trophy.textContent = winner === null ? '🤝' : '🏆';
  title.textContent = winner === null ? 'Durang!' : `${winner + 1}-ishtirokchi marraga birinchi keldi!`;

  // Save to profile
  saveRaceResult({
    fan: raceState.fan, mavzu: raceState.mavzu,
    ball: gameData.distance[winner ?? 0], togri: gameData.togri[winner ?? 0], total, vaqt: sec,
    sana: new Date().toISOString(),
  });
}

function resetRace() {
  document.getElementById('resultsPanel').style.display = 'none';
  document.getElementById('setupPanel').style.display = 'block';
  document.getElementById('setupStatus').innerHTML = '';
  raceState = { fan: null, sinf: null, mavzu: '', daraja: null, son: null };
  document.querySelectorAll('.option-tile, .option-pill').forEach(b => b.classList.remove('selected'));
  document.getElementById('raceMavzu').value = '';
}

function saveRaceResult(result) {
  try {
    const arr = JSON.parse(localStorage.getItem('dv-results') || '[]');
    arr.unshift(result);
    localStorage.setItem('dv-results', JSON.stringify(arr.slice(0, 50)));
  } catch {}
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
