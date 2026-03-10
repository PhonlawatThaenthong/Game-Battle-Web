// ── HISTORY (localStorage) ────────────────────────────────────────
let winHistory   = JSON.parse(localStorage.getItem(`${GAME_ID}_history`) || '{}');
let historyMeta  = JSON.parse(localStorage.getItem(`${GAME_ID}_meta`)    || '{"totalGames":0,"totalRounds":0}');

function recordWin(anime) {
  if (!winHistory[anime.title]) winHistory[anime.title] = { wins:0, championships:0, lastWon:null, genre:anime.genre, jp:anime.jp };
  winHistory[anime.title].wins++;
  winHistory[anime.title].lastWon = Date.now();
  saveHistory();
}
function recordChampion(anime) {
  if (!winHistory[anime.title]) winHistory[anime.title] = { wins:0, championships:0, lastWon:null, genre:anime.genre, jp:anime.jp };
  winHistory[anime.title].championships = (winHistory[anime.title].championships||0) + 1;
  winHistory[anime.title].lastWon = Date.now();
  historyMeta.totalGames++;
  historyMeta.totalRounds += round - 1;
  saveHistory();
}
function saveHistory() {
  localStorage.setItem(`${GAME_ID}_history`, JSON.stringify(winHistory));
  localStorage.setItem(`${GAME_ID}_meta`,    JSON.stringify(historyMeta));
}
function clearHistory() {
  if (!confirm('ล้างประวัติทั้งหมด?')) return;
  winHistory = {}; historyMeta = { totalGames:0, totalRounds:0 };
  saveHistory(); renderDashboard();
}

// ── DASHBOARD ─────────────────────────────────────────────────────
let currentTab = 'wins';

function openDashboard() {
  document.getElementById('dashboard-page').classList.add('open');
  renderDashboard();

  const needed = Object.keys(winHistory).filter(t => !imgCache[t] || imgCache[t] === FALLBACK);
  if (needed.length === 0) return;
  const animeNeeded = ANIME.filter(a => needed.includes(a.title));
  (async () => {
    for (const anime of animeNeeded) {
      await fetchImage(anime);
      renderDashboard();
      await new Promise(r => setTimeout(r, 800));
    }
  })();
}
function closeDashboard() { document.getElementById('dashboard-page').classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.id === 'dashboard-page') closeDashboard(); });

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  renderDashboard();
}

function timeAgo(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now()-ts)/60000);
  const h = Math.floor(m/60), d = Math.floor(h/24);
  if (m < 1) return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${d} วันที่แล้ว`;
}

function renderDashboard() {
  const entries = Object.entries(winHistory);
  const topEntry = [...entries].sort((a,b) => b[1].wins - a[1].wins)[0];
  document.getElementById('stat-total-games').textContent    = historyMeta.totalGames;
  document.getElementById('stat-total-rounds').textContent   = historyMeta.totalRounds;
  document.getElementById('stat-unique-winners').textContent = entries.length;
  document.getElementById('stat-top-anime').textContent      = topEntry ? topEntry[0].split(' ')[0] : '—';

  const content = document.getElementById('dash-content');
  if (entries.length === 0) {
    content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">🎌</div><p>ยังไม่มีประวัติการชนะ<br>เริ่มเล่นเพื่อบันทึกข้อมูล!</p></div>`;
    return;
  }
  let sorted;
  if (currentTab === 'wins') {
    sorted = [...entries].sort((a,b) => b[1].wins - a[1].wins);
  } else if (currentTab === 'recent') {
    sorted = [...entries].filter(([,v]) => v.lastWon).sort((a,b) => b[1].lastWon - a[1].lastWon);
  } else {
    sorted = [...entries].filter(([,v]) => (v.championships||0) > 0).sort((a,b) => (b[1].championships||0) - (a[1].championships||0));
    if (!sorted.length) { content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">👑</div><p>ยังไม่มีแชมป์<br>เล่นจนจบเกมเพื่อสร้างแชมป์!</p></div>`; return; }
  }
  const maxWins = sorted[0]?.[1].wins || 1;
  content.innerHTML = `<div class="dash-list">${sorted.map(([title, data], i) => {
    const rawImg = imgCache[title];
    // never embed FALLBACK SVG inline — let onerror handle missing images
    const img = (rawImg && rawImg !== FALLBACK) ? rawImg : '';
    const r   = i + 1;
    const rSym = r===1?'🥇':r===2?'🥈':r===3?'🥉':r;
    const rCls = r===1?'r1':r===2?'r2':r===3?'r3':'other';
    const pct  = Math.round((data.wins / maxWins)*100);
    const champ = (data.championships||0) > 0 ? `<span class="dash-champion-badge">👑 ×${data.championships}</span>` : '';
    const stat = currentTab === 'champion'
      ? `<span class="dash-wins-num">👑 ×${data.championships}</span>`
      : `<div class="dash-wins-bar-wrap"><div class="dash-wins-bar"><div class="dash-wins-bar-fill" style="width:${pct}%"></div></div><span class="dash-wins-num">${data.wins} W</span></div>`;
    return `<div class="dash-row" style="animation-delay:${i*.04}s">
      <div class="dash-rank ${rCls}">${rSym}</div>
      <img class="dash-img" src="${img}" alt="${title}" onerror="this.onerror=null;this.src='';this.style.background='#222'"/>
      <div class="dash-info">
        <div class="dash-anime-title">${title}</div>
        <div class="dash-anime-meta">${data.genre||''} ${champ}</div>
        <div class="dash-last-won">${timeAgo(data.lastWon)}</div>
      </div>${stat}</div>`;
  }).join('')}</div>`;
}

// ── STATE ────────────────────────────────────────────────────────
let rejected = new Set();   // anime that lost — never shown again
let pool     = [];
let leftAnime, rightAnime;
let wins     = {};
let round    = 1;
let locked   = false;
