// ── ADMIN GATE (SHA-256 via Web Crypto) ──────────────────────────
let adminUnlocked = false;
const ADMIN_HASH = 'ed085f73f89f1d600c548c9d3f821acdf2d8e36d7e7499e6f7718342d4c2aae1';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function checkAdminPw() {
  const val = document.getElementById('admin-pw-input').value;
  const err = document.getElementById('admin-pw-err');
  const hash = await sha256(val);
  if (hash === ADMIN_HASH) {
    adminUnlocked = true;
    document.getElementById('admin-pw-input').value = '';
    document.getElementById('admin-gate-locked').style.display   = 'none';
    document.getElementById('admin-gate-unlocked').style.display = 'flex';
    loadApiKeysUI();
    updateKeyIndicator();
    err.classList.remove('show');
  } else {
    err.classList.add('show');
    document.getElementById('admin-pw-input').value = '';
  }
}

function lockAdminSettings() {
  adminUnlocked = false;
  document.getElementById('admin-gate-locked').style.display   = '';
  document.getElementById('admin-gate-unlocked').style.display = 'none';
  document.getElementById('admin-pw-input').value = '';
}

function openSettings() {
  document.getElementById('settings-page').classList.add('open');
  lockAdminSettings();
  // sync pool size slider
  const slider = document.getElementById('pool-size-slider');
  const label  = document.getElementById('pool-size-val');
  if (slider) { slider.value = poolSize; label.textContent = poolSize; }
  updateKeyIndicator();
}
function closeSettings() { document.getElementById('settings-page').classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.id === 'settings-page') closeSettings(); });

function toggleKeyVis() {
  const input = document.getElementById('settings-key-input');
  const btn   = document.querySelector('.toggle-vis');
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈 ซ่อน'; }
  else                           { input.type = 'password'; btn.textContent = '👁 แสดง'; }
}

function updateKeyIndicator() {
  const dot  = document.getElementById('key-dot');
  const text = document.getElementById('key-indicator-text');
  const btn  = document.getElementById('settings-btn');
  if (!dot || !text) return;
  const total     = YT_API_KEYS.length;
  const available = total - exhaustedKeys.size;
  if (total === 0) {
    dot.classList.remove('active');
    text.textContent = 'ยังไม่ได้ตั้งค่า API Key';
    text.style.color = ''; text.style.opacity = '.4';
    if (btn) btn.style.borderColor = '';
  } else if (available === 0) {
    dot.classList.remove('active');
    text.textContent = `⚠ Quota หมดทุก key (${total} key)`;
    text.style.color = '#ff2d55'; text.style.opacity = '1';
    if (btn) btn.style.borderColor = 'rgba(255,45,85,.3)';
  } else {
    dot.classList.add('active');
    text.textContent = `✓ ${available}/${total} key พร้อมใช้`;
    text.style.color = '#4cff91'; text.style.opacity = '1';
    if (btn) btn.style.borderColor = 'rgba(76,255,145,.3)';
  }
}

let GOOGLE_CLIENT_ID = localStorage.getItem('google_client_id') || '';

function saveGoogleClientId(val) {
  GOOGLE_CLIENT_ID = val.trim();
  localStorage.setItem('google_client_id', GOOGLE_CLIENT_ID);
}

function initApiKeyUI() {
  updateKeyIndicator();
  initVolumeUI();
  loadApiKeysUI();
}
