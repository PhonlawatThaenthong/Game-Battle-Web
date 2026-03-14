const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');

// ── Middleware ────────────────────────────────────────────────────
app.use(express.json());

// ── Data Layer ───────────────────────────────────────────────────
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      anime: { history: {}, meta: { totalGames: 0, totalRounds: 0 } },
      game:  { history: {}, meta: { totalGames: 0, totalRounds: 0 } },
      song:  { history: {}, meta: { totalGames: 0, totalRounds: 0 } }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
  }
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Write lock: serialize all writes through a promise chain
let writeLock = Promise.resolve();

function atomicUpdate(gameId, updateFn) {
  return new Promise((resolve, reject) => {
    writeLock = writeLock.then(async () => {
      try {
        const data = readData();
        if (!data[gameId]) {
          data[gameId] = { history: {}, meta: { totalGames: 0, totalRounds: 0 } };
        }
        const result = updateFn(data, gameId);
        await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Validate gameId ──────────────────────────────────────────────
const VALID_GAME_IDS = ['anime', 'game', 'song'];

function validateGameId(req, res, next) {
  if (!VALID_GAME_IDS.includes(req.params.gameId)) {
    return res.status(400).json({ error: 'Invalid gameId. Must be: anime, game, or song' });
  }
  next();
}

// ── API Routes ───────────────────────────────────────────────────

// GET leaderboard data
app.get('/api/leaderboard/:gameId', validateGameId, (req, res) => {
  try {
    const data = readData();
    const gameData = data[req.params.gameId] || { history: {}, meta: { totalGames: 0, totalRounds: 0 } };
    res.json(gameData);
  } catch (err) {
    console.error('GET leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST record a round win
app.post('/api/leaderboard/:gameId/win', validateGameId, async (req, res) => {
  const { title, genre, jp } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const result = await atomicUpdate(req.params.gameId, (data, gid) => {
      const hist = data[gid].history;
      if (!hist[title]) hist[title] = { wins: 0, championships: 0, lastWon: null, genre: genre || '', jp: jp || '' };
      hist[title].wins++;
      hist[title].lastWon = Date.now();
      return { entry: hist[title] };
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST win error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST record a championship
app.post('/api/leaderboard/:gameId/champion', validateGameId, async (req, res) => {
  const { title, genre, jp, rounds } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (rounds == null) return res.status(400).json({ error: 'rounds is required' });

  try {
    const result = await atomicUpdate(req.params.gameId, (data, gid) => {
      const hist = data[gid].history;
      if (!hist[title]) hist[title] = { wins: 0, championships: 0, lastWon: null, genre: genre || '', jp: jp || '' };
      hist[title].championships = (hist[title].championships || 0) + 1;
      hist[title].lastWon = Date.now();
      data[gid].meta.totalGames++;
      data[gid].meta.totalRounds += rounds;
      return { entry: hist[title], meta: data[gid].meta };
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST champion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST clear history
app.post('/api/leaderboard/:gameId/clear', validateGameId, async (req, res) => {
  try {
    await atomicUpdate(req.params.gameId, (data, gid) => {
      data[gid].history = {};
      data[gid].meta = { totalGames: 0, totalRounds: 0 };
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST clear error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Block sensitive directories ──────────────────────────────────
app.use('/node_modules', (req, res) => res.status(403).end());
app.use('/data', (req, res) => res.status(403).end());
app.use('/.claude', (req, res) => res.status(403).end());

// ── Static Files ─────────────────────────────────────────────────
app.use(express.static(__dirname));

// ── Start ────────────────────────────────────────────────────────
ensureDataFile();
app.listen(PORT, () => {
  console.log(`Game Battle Web running at http://localhost:${PORT}`);
});
