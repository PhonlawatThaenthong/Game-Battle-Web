// ── VOLUME ────────────────────────────────────────────────────────
let trailerVolume = parseInt(localStorage.getItem('trailer_volume') ?? '80');

function initVolumeUI() {
  const slider = document.getElementById('vol-slider');
  const valEl  = document.getElementById('vol-value');
  if (!slider) return;
  slider.value = trailerVolume;
  valEl.textContent = trailerVolume;
  updateSliderTrack(slider, trailerVolume);
  updateVolIcon(trailerVolume);
}

function onVolumeSlide(val) {
  val = parseInt(val);
  document.getElementById('vol-value').textContent = val;
  updateSliderTrack(document.getElementById('vol-slider'), val);
  updateVolIcon(val);
  // apply live to any open iframes
  applyVolumeToIframes(val);
}

function saveVolume(val) {
  trailerVolume = parseInt(val);
  localStorage.setItem('trailer_volume', trailerVolume);
}

function updateSliderTrack(slider, val) {
  slider.style.setProperty('--pct', `${val}%`);
}

function updateVolIcon(val) {
  const icon = document.getElementById('vol-icon');
  if (!icon) return;
  icon.textContent = val == 0 ? '🔇' : val < 40 ? '🔉' : '🔊';
}

function applyVolumeToIframes(vol) {
  // update YT.Player instances directly (preferred)
  if (typeof ytPlayers !== 'undefined') {
    Object.values(ytPlayers).forEach(p => {
      try { p.setVolume(vol); if (vol === 0) p.mute(); else p.unMute(); } catch {}
    });
  }
  // fallback postMessage for any raw iframes
  document.querySelectorAll('.trailer-wrap iframe').forEach(iframe => {
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*'
      );
    } catch(_) {}
  });
}

function setIframeVolume(iframe, vol) {
  // wait for iframe to be ready then send volume command
  iframe.addEventListener('load', () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*'
        );
        if (vol === 0) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*'
          );
        } else {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*'
          );
        }
      } catch(_) {}
    }, 1000);
  });
}

// ── API KEY MANAGEMENT (multi-key rotation) ───────────────────────
function loadApiKeysUI() {
  const container = document.getElementById('yt-keys-container');
  if (!container) return;
  container.innerHTML = '';
  YT_API_KEYS.forEach((key, i) => {
    const isExhausted = exhaustedKeys.has(key);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;';
    row.innerHTML = `
      <input type="password" value="${key}" data-idx="${i}"
        style="flex:1;background:rgba(255,255,255,.06);border:1px solid ${isExhausted ? 'rgba(255,45,85,.4)' : 'rgba(255,255,255,.12)'};border-radius:6px;color:${isExhausted ? '#ff2d55' : '#fff'};font-size:.78rem;padding:7px 10px;outline:none;font-family:monospace;"
        placeholder="AIza..." spellcheck="false"
        oninput="updateKeyInList(${i}, this.value)"/>
      <button onclick="toggleKeyRowVis(this)" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);border-radius:5px;padding:5px 8px;cursor:pointer;font-size:.72rem;white-space:nowrap;">👁</button>
      <span style="font-size:.65rem;opacity:.4;white-space:nowrap;">#${i + 1}${isExhausted ? ' ⚠quota' : ''}</span>
      <button onclick="removeKey(${i})" style="background:rgba(255,45,85,.15);border:1px solid rgba(255,45,85,.3);color:#ff2d55;border-radius:5px;padding:5px 9px;cursor:pointer;font-size:.75rem;">✕</button>`;
    container.appendChild(row);
  });
}

function toggleKeyRowVis(btn) {
  const input = btn.parentElement.querySelector('input');
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈'; }
  else                           { input.type = 'password'; btn.textContent = '👁';  }
}

function updateKeyInList(idx, val) {
  YT_API_KEYS[idx] = val.trim();
  saveApiKeys();
}

function addNewKey() {
  YT_API_KEYS.push('');
  loadApiKeysUI();
  // focus last input
  const inputs = document.querySelectorAll('#yt-keys-container input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeKey(idx) {
  YT_API_KEYS.splice(idx, 1);
  saveApiKeys();
  loadApiKeysUI();
}

function saveApiKeys() {
  // filter empty
  YT_API_KEYS = YT_API_KEYS.filter(k => k.trim());
  localStorage.setItem('yt_api_keys', JSON.stringify(YT_API_KEYS));
  // reset exhausted on save so new keys get tried
  exhaustedKeys.clear();
  Object.keys(trailerCache).forEach(k => delete trailerCache[k]);
  updateKeyIndicator();
}

function saveApiKey() {
  // collect all current inputs
  document.querySelectorAll('#yt-keys-container input').forEach((inp, i) => {
    if (YT_API_KEYS[i] !== undefined) YT_API_KEYS[i] = inp.value.trim();
  });
  saveApiKeys();
  const status = document.getElementById('settings-status');
  status.textContent = `✓ บันทึก ${YT_API_KEYS.length} key แล้ว`;
  status.className = 'settings-status ok';
  updateKeyIndicator();
  setTimeout(() => { status.className = 'settings-status'; closeSettings(); lockAdminSettings(); }, 1200);
}
let poolSize    = parseInt(localStorage.getItem(`${GAME_ID}_pool_size`) || '30');
let activePool  = [];

function savePoolSize(val) {
  poolSize = parseInt(val);
  localStorage.setItem(`${GAME_ID}_pool_size`, poolSize);
}

function initPoolSizeUI() {
  const slider = document.getElementById('pool-size-slider');
  const label  = document.getElementById('pool-size-val');
  if (!slider) return;
  slider.max   = ANIME.length;
  slider.value = poolSize;
  label.textContent = poolSize;
  slider.addEventListener('change', e => savePoolSize(e.target.value));
}
