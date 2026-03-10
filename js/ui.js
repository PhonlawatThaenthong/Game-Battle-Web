// ── RENDER ───────────────────────────────────────────────────────
async function renderPanel(side, anime, animClass) {
  const bg    = document.getElementById(`${side}-bg`);
  const title = document.getElementById(`${side}-title`);
  const jp    = document.getElementById(`${side}-title-jp`);
  const genre = document.getElementById(`${side}-genre`);
  const panel = document.getElementById(side);

  // show text immediately
  title.textContent = anime.title;
  jp.textContent    = anime.jp;
  genre.textContent = anime.genre;
  bg.style.backgroundImage = `url('${imgCache[anime.title] || FALLBACK}')`;

  if (animClass) {
    panel.classList.remove('anim-left', 'anim-right');
    void panel.offsetWidth;
    panel.classList.add(animClass);
  }

  // load image (from cache or API) then update bg
  const url = await fetchImage(anime);
  bg.style.backgroundImage = `url('${url}')`;
}

function updateUI() {
  document.getElementById('round-counter').textContent = `ROUND ${round}`;
  const remaining = activePool.length - rejected.size;
  document.getElementById('remaining-counter').textContent = `เหลือ ${remaining} เรื่อง`;
}

function updateLastPick(anime) {
  const img  = document.getElementById('last-pick-img');
  const name = document.getElementById('last-pick-name');
  const vs   = document.getElementById('vs-text');

  vs.style.display = 'none';

  img.classList.remove('visible');
  name.classList.remove('visible');
  void img.offsetWidth;

  img.src = imgCache[anime.title] || FALLBACK;
  img.classList.add('visible');
  name.textContent = anime.title;
  name.classList.add('visible');
}

// ── CHOOSE ───────────────────────────────────────────────────────
// ── GAME LOG ─────────────────────────────────────────────────────
const gameLog = []; // { time, title, type: 'win'|'lose' }
let logFilter = 'all';

function addLog(winner, loser) {
  const now = new Date();
  const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  gameLog.unshift({ time, title: winner.title, type: 'win' });
  gameLog.unshift({ time, title: loser.title,  type: 'lose' });
}

function openGameLog() {
  document.getElementById('log-page').classList.add('open');
  renderLog();
}
function closeGameLog() { document.getElementById('log-page').classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.id === 'log-page') closeGameLog(); });

function filterLog(type) {
  logFilter = type;
  document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`log-filter-${type}`).classList.add('active');
  renderLog();
}

function clearGameLog() {
  if (!confirm('ล้าง Log ทั้งหมดใช่ไหม?')) return;
  gameLog.length = 0;
  renderLog();
}

function renderLog() {
  const body = document.getElementById('log-body');
  if (!body) return;
  const entries = logFilter === 'all' ? gameLog : gameLog.filter(e => e.type === logFilter);
  if (entries.length === 0) {
    body.innerHTML = '<div class="log-empty">ยังไม่มี Log</div>';
    return;
  }
  body.innerHTML = entries.map(e => `
    <div class="log-entry ${e.type}">
      <span class="log-time">[${e.time}]</span>
      <span class="log-badge ${e.type}">${e.type === 'win' ? '🏆 Win' : '💀 Lose'}</span>
      <span class="log-title">${e.title}</span>
    </div>`).join('');
}

function choose(side) {
  if (locked) return;
  locked = true;

  const chosen        = side === 'left' ? leftAnime  : rightAnime;
  const rejected_anime = side === 'left' ? rightAnime : leftAnime;
  const rejectSide    = side === 'left' ? 'right' : 'left';

  // Mark loser as rejected — won't appear again
  rejected.add(rejected_anime);

  addLog(chosen, rejected_anime);
  recordWin(chosen);
  wins[side] = (wins[side] || 0) + 1;
  round++;

  updateLastPick(chosen);

  // flash winner
  document.getElementById(side).classList.add('flash-win');
  setTimeout(() => document.getElementById(side).classList.remove('flash-win'), 700);

  // replace both sides with new anime
  const newLeft  = nextAnime(chosen, rejected_anime);
  const newRight = newLeft ? nextAnime(chosen, newLeft) : null;

  // Check if pool is exhausted (can't fill even one side)
  if (newLeft === null) {
    showWinner(chosen);
    locked = false;
    return;
  }

  clearTrailer('left');
  clearTrailer('right');

  leftAnime  = newLeft;
  rightAnime = newRight || nextAnime(newLeft, null) || newLeft;
  renderPanel('left',  leftAnime,  'anim-left');
  renderPanel('right', rightAnime, 'anim-right');

  updateUI();
  showToast(`✦ คุณเลือก ${chosen.title}`);

  setTimeout(() => { locked = false; }, 520);
}

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}
