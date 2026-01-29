// leaderboard.js (FULL FILE)
// ✅ Key behavior:
// - All Time (no date picked): shows ALL players across ALL resets (current + all seasons)
// - If you pick a date (calendar): shows ONLY scores made on that date (by history timestamp)
// - Works even if players docs have no date, because it uses gameHistory timestamps
// - bp26 aggregate respects date selection (Game1..Game5)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwqOOawElTcsBIAmJQIkZYs-W-h8kJx7A",
  authDomain: "temporary-db-e9ace.firebaseapp.com",
  databaseURL: "https://temporary-db-e9ace-default-rtdb.firebaseio.com",
  projectId: "temporary-db-e9ace",
  storageBucket: "temporary-db-e9ace.firebasestorage.app",
  messagingSenderId: "810939107125",
  appId: "1:810939107125:web:25edc649d354c1ca0bee7c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ======================
// UI references
// ======================
const gameSelect = document.getElementById("gameSelect");
const timeSelect = document.getElementById("timeFilter");
const seasonDate = document.getElementById("seasonDate");
const clearDateBtn = document.getElementById("clearDateBtn");

const leaderboardEl = document.getElementById("leaderboard");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageNumEl = document.getElementById("pageNum");
const totalPagesEl = document.getElementById("totalPages");

const statusToggle = document.getElementById("statusToggle");
const resetBtn = document.getElementById("resetBtn");
const resetHint = document.getElementById("resetHint");

// ======================
// State
// ======================
let currentGame = "Global";
let currentPage = 1;
const perPage = 10;
let playersData = [];

// cache seasons list per game
const seasonsCache = new Map(); // gameId -> [seasonId,...]

// ======================
// Helpers
// ======================
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toMillisMaybe(ts) {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;

  // Firestore Timestamp
  if (typeof ts?.toMillis === "function") return ts.toMillis();

  // Sometimes people store {seconds, nanoseconds}
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;

  return 0;
}

// LOCAL YYYY-MM-DD
function ymdLocal(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPickedDate() {
  return (seasonDate?.value || "").trim(); // YYYY-MM-DD
}

function getTimeMode() {
  return (timeSelect?.value || "all").trim();
}

function rangeFilter(ms, mode) {
  if (!ms) return false;

  const now = new Date();
  const d = new Date(ms);

  if (mode === "daily") {
    return ymdLocal(ms) === ymdLocal(now.getTime());
  }

  if (mode === "weekly") {
    const diff = (now.getTime() - ms) / 86400000;
    return diff >= 0 && diff < 7;
  }

  if (mode === "monthly") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  return true; // "all"
}

function normalizeHistoryDoc(data) {
  const username = String(data.username ?? data.playerName ?? data.name ?? "").trim();

  // Your bp26-score writes "score"
  const score = toNum(data.score ?? data.delta ?? data.totalScore ?? 0);

  const ts =
    toMillisMaybe(data.timestamp) ||
    toMillisMaybe(data.createdAt) ||
    toMillisMaybe(data.updatedAt);

  return { username, score, ts };
}

// ======================
// Firestore helpers
// ======================
async function fetchGames() {
  const snap = await getDocs(collection(db, "zat-am"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchSeasonIds(gameId) {
  // ✅ FIX: Global ALSO has seasons and must be included
  if (!gameId) return [];

  // bp26 is virtual aggregate (not a real seasons location)
  if (gameId === "bp26") return [];

  if (seasonsCache.has(gameId)) return seasonsCache.get(gameId);

  const seasonsCol = collection(db, "zat-am", gameId, "seasons");
  let ids = [];
  try {
    const snap = await getDocs(seasonsCol);
    ids = snap.docs.map((d) => d.id);
  } catch (e) {
    ids = [];
  }

  ids.sort();
  seasonsCache.set(gameId, ids);
  return ids;
}

async function fetchHistoryForGame(gameId) {
  const out = [];

  // current history
  try {
    const curSnap = await getDocs(collection(db, "zat-am", gameId, "gameHistory"));
    curSnap.forEach((d) => out.push(normalizeHistoryDoc(d.data())));
  } catch (e) {
    // ok if doesn't exist
  }

  // seasons history
  const seasonIds = await fetchSeasonIds(gameId);
  for (const sid of seasonIds) {
    try {
      const sSnap = await getDocs(collection(db, "zat-am", gameId, "seasons", sid, "gameHistory"));
      sSnap.forEach((d) => out.push(normalizeHistoryDoc(d.data())));
    } catch (e) {
      // ok
    }
  }

  return out;
}

// aggregate history into leaderboard rows
function aggregateHistory(history, { dateStr = "", timeMode = "all" } = {}) {
  const map = new Map(); // username -> {username,totalScore,lastPlayed}

  for (const h of history) {
    if (!h.username) continue;

    // ✅ IMPORTANT: skip invalid timestamps so they never mess filtering
    if (!h.ts || h.ts <= 0) continue;

    // If a date is picked, ONLY that date
    if (dateStr) {
      if (ymdLocal(h.ts) !== dateStr) continue;
    } else {
      // otherwise apply time filter
      if (!rangeFilter(h.ts, timeMode)) continue;
    }

    const prev = map.get(h.username) || { username: h.username, totalScore: 0, lastPlayed: 0 };
    prev.totalScore += toNum(h.score);
    prev.lastPlayed = Math.max(prev.lastPlayed, toNum(h.ts));
    map.set(h.username, prev);
  }

  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

// bp26 aggregate across 5 games using history (date aware)
async function loadBp26Aggregate() {
  const dateStr = getPickedDate();
  const timeMode = getTimeMode();

  const gameIds = ["bp26-Game1", "bp26-Game2", "bp26-Game3", "bp26-Game4", "bp26-Game5"];

  const all = new Map(); // username -> agg
  for (const gid of gameIds) {
    const hist = await fetchHistoryForGame(gid);
    const rows = aggregateHistory(hist, { dateStr, timeMode });

    for (const r of rows) {
      const prev = all.get(r.username) || { username: r.username, totalScore: 0, lastPlayed: 0 };
      prev.totalScore += toNum(r.totalScore);
      prev.lastPlayed = Math.max(prev.lastPlayed, toNum(r.lastPlayed));
      all.set(r.username, prev);
    }
  }

  return Array.from(all.values()).sort((a, b) => b.totalScore - a.totalScore);
}

// ======================
// Render
// ======================
function listDataOnly() {
  return playersData.slice(3);
}

function getTotalPages(list) {
  return Math.max(1, Math.ceil(list.length / perPage));
}

function render() {
  // Podium
  for (let i = 0; i < 3; i++) {
    const player = playersData[i];
    const nameEl = document.getElementById("name-" + (i + 1));
    const scoreEl = document.getElementById("score-" + (i + 1));

    if (nameEl) nameEl.textContent = player ? player.username : "---";
    if (scoreEl) scoreEl.textContent = player ? player.totalScore.toLocaleString() : "---";
  }

  // List
  const list = listDataOnly();
  const totalPages = getTotalPages(list);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * perPage;
  const pageSlice = list.slice(start, start + perPage);

  leaderboardEl.innerHTML = pageSlice
    .map(
      (p, i) => `
        <div class="row">
          <div class="rank-cell">${start + i + 4}</div>
          <div class="name-cell">${p.username}</div>
          <div class="score-cell">${p.totalScore.toLocaleString()}</div>
        </div>
      `
    )
    .join("");

  pageNumEl.textContent = currentPage;
  totalPagesEl.textContent = totalPages;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

function changePage(page) {
  const list = listDataOnly();
  const totalPages = getTotalPages(list);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  render();
}

nextBtn?.addEventListener("click", () => changePage(currentPage + 1));
prevBtn?.addEventListener("click", () => changePage(currentPage - 1));

// ======================
// Chart.js (uses lastPlayed from history aggregation)
// ======================
const lineGraph = document.getElementById("line-graph");
let myChart = null;

function ensureChart() {
  if (!lineGraph || myChart) return;
  if (typeof Chart === "undefined") return;

  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }

  myChart = new Chart(lineGraph, {
    type: "line",
    data: { labels, datasets: [{ data: Array(7).fill(0), borderWidth: 3, fill: true }] },
    options: {
      aspectRatio: 6,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, padding: 12 } }],
        xAxes: [{ ticks: { padding: 12 } }]
      },
      legend: { display: false }
    }
  });
}

function renderChartFromPlayers(players) {
  ensureChart();
  if (!myChart) return;

  const counts = Array(7).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of players) {
    if (!p.lastPlayed) continue;
    const d = new Date(p.lastPlayed);
    d.setHours(0, 0, 0, 0);

    const diffDays = (today - d) / 86400000;
    if (diffDays >= 0 && diffDays < 7) counts[6 - diffDays] += 1;
  }

  myChart.data.datasets[0].data = counts;
  myChart.update();
}

// ======================
// Admin Panel
// ======================
const mockIsAdmin = true;

onAuthStateChanged(auth, async (user) => {
  const adminPanel = document.getElementById("adminPanel");
  if (!adminPanel) return;

  let isAdmin = false;
  if (user) {
    const idTokenResult = await user.getIdTokenResult();
    isAdmin = idTokenResult.claims?.admin === true;
  }

  adminPanel.style.display = (mockIsAdmin || isAdmin) ? "block" : "none";

  if (mockIsAdmin || isAdmin) {
    await syncToggleStatus(currentGame);
    await checkResetEligibility();
  }
});

async function syncToggleStatus(gameId) {
  if (!gameId || gameId === "Global" || gameId === "bp26") {
    statusToggle.disabled = true;
    statusToggle.checked = false;
    return;
  }

  statusToggle.disabled = false;

  const gameSnap = await getDoc(doc(db, "zat-am", gameId));
  statusToggle.checked = gameSnap.exists()
    ? (gameSnap.data().competitionIsActive === true)
    : false;
}

async function checkResetEligibility() {
  const gameId = currentGame;

  if (!resetBtn || !resetHint) return;

  if (!gameId || gameId === "Global") {
    resetBtn.disabled = false;
    resetBtn.style.background = "";
    resetHint.textContent = "";
    return;
  }

  if (gameId === "bp26") {
    resetBtn.disabled = true;
    resetBtn.style.background = "#ccc";
    resetHint.style.color = "#d30000";
    resetHint.textContent = "bp26 is aggregate. Reset individual games instead.";
    return;
  }

  // only allow reset when no specific date is selected
  if (getPickedDate()) {
    resetBtn.disabled = true;
    resetBtn.style.background = "#ccc";
    resetHint.style.color = "#d30000";
    resetHint.textContent = "Clear the date to reset current.";
    return;
  }

  const gameDoc = await getDoc(doc(db, "zat-am", gameId));
  if (gameDoc.exists() && gameDoc.data().competitionIsActive) {
    resetBtn.disabled = true;
    resetBtn.style.background = "#ccc";
    resetHint.style.color = "#d30000";
    resetHint.textContent = "Competition active. Reset locked.";
  } else {
    resetBtn.disabled = false;
    resetBtn.style.background = "";
    resetHint.textContent = "";
  }
}

statusToggle?.addEventListener("change", async (e) => {
  const gameId = gameSelect.value;
  if (!gameId || gameId === "Global" || gameId === "bp26") return;

  const newState = e.target.checked;

  try {
    await setDoc(
      doc(db, "zat-am", gameId),
      { competitionIsActive: newState, updatedAt: serverTimestamp() },
      { merge: true }
    );
    await checkResetEligibility();
  } catch (err) {
    console.error("Update failed:", err);
    statusToggle.checked = !newState;
    alert("Database update failed.");
  }
});

// ======================
// ✅ Reset with archive
// ======================
function dateOnlyId(d = new Date()) {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

async function findAvailableSeasonId(gameId, baseId) {
  const baseRef = doc(db, "zat-am", gameId, "seasons", baseId);
  const snap = await getDoc(baseRef);
  if (!snap.exists()) return baseId;

  let i = 2;
  while (i < 500) {
    const candidate = `${baseId}-${i}`;
    const s = await getDoc(doc(db, "zat-am", gameId, "seasons", candidate));
    if (!s.exists()) return candidate;
    i++;
  }
  return `${baseId}-${Date.now()}`;
}

async function performReset(gameId) {
  if (gameId === "bp26") {
    alert("bp26 is aggregate. Reset one of: bp26-Game1..bp26-Game5");
    return;
  }

  if (getPickedDate()) {
    alert("Clear the date first (we only reset CURRENT).");
    return;
  }

  if (!confirm(`Archive + reset CURRENT leaderboard for [${gameId}]?\n\nOld scores will be saved under seasons/`)) {
    return;
  }

  const playersColRef = collection(db, "zat-am", gameId, "players");
  const historyColRef = collection(db, "zat-am", gameId, "gameHistory");

  const [playersSnap, historySnap] = await Promise.all([
    getDocs(playersColRef),
    getDocs(historyColRef)
  ]);

  if (playersSnap.empty && historySnap.empty) {
    alert("Nothing to reset (already empty).");
    return;
  }

  try {
    const base = dateOnlyId(new Date());
    const seasonId = await findAvailableSeasonId(gameId, base);

    // create season doc
    await setDoc(doc(db, "zat-am", gameId, "seasons", seasonId), {
      seasonId,
      seasonName: seasonId,
      createdAt: serverTimestamp(),
      playersCount: playersSnap.size,
      historyCount: historySnap.size
    });

    async function copySnapToSeason(subName, snap) {
      if (!snap || snap.empty) return;

      const destCol = collection(db, "zat-am", gameId, "seasons", seasonId, subName);

      let batch = writeBatch(db);
      let n = 0;

      for (const d of snap.docs) {
        batch.set(doc(destCol, d.id), d.data(), { merge: false });
        n++;
        if (n % 450 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      await batch.commit();
    }

    await copySnapToSeason("players", playersSnap);
    await copySnapToSeason("gameHistory", historySnap);

    // delete current
    let delBatch = writeBatch(db);
    let delN = 0;

    for (const d of playersSnap.docs) {
      delBatch.delete(d.ref);
      delN++;
      if (delN % 450 === 0) {
        await delBatch.commit();
        delBatch = writeBatch(db);
      }
    }

    for (const d of historySnap.docs) {
      delBatch.delete(d.ref);
      delN++;
      if (delN % 450 === 0) {
        await delBatch.commit();
        delBatch = writeBatch(db);
      }
    }

    await delBatch.commit();

    await setDoc(
      doc(db, "zat-am", gameId),
      { updatedAt: serverTimestamp(), lastResetSeasonId: seasonId },
      { merge: true }
    );

    // clear caches so new season appears
    seasonsCache.delete(gameId);

    alert(`✅ Archived to seasons/${seasonId} and reset CURRENT leaderboard for ${gameId}.`);

    await loadLeaderboardForSelection();

  } catch (error) {
    console.error("Reset failed:", error);
    alert("Reset failed. Check console.");
  }
}

resetBtn?.addEventListener("click", () => {
  const gameId = gameSelect.value;
  if (!gameId || gameId === "Global") {
    alert("Select a game first (not Global).");
    return;
  }
  performReset(gameId);
});

// ======================
// LOAD LOGIC
// ======================
async function loadLeaderboardForSelection() {
  const dateStr = getPickedDate();
  const timeMode = getTimeMode();

  try {
    if (currentGame === "bp26") {
      playersData = await loadBp26Aggregate();
    } else {
      const hist = await fetchHistoryForGame(currentGame);
      playersData = aggregateHistory(hist, { dateStr, timeMode });
    }

    currentPage = 1;
    render();
    renderChartFromPlayers(playersData);

    await syncToggleStatus(currentGame);
    await checkResetEligibility();

    console.log("LOAD =>", { game: currentGame, date: dateStr || "(none)", timeMode, rows: playersData.length });
  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load leaderboard data. Check console (F12).");
  }
}

// ======================
// Events
// ======================
gameSelect?.addEventListener("change", async (e) => {
  currentGame = e.target.value;
  await loadLeaderboardForSelection();
});

timeSelect?.addEventListener("change", async () => {
  await loadLeaderboardForSelection();
});

seasonDate?.addEventListener("change", async () => {
  await loadLeaderboardForSelection();
  await checkResetEligibility();
});

clearDateBtn?.addEventListener("click", async () => {
  if (seasonDate) seasonDate.value = "";
  await loadLeaderboardForSelection();
  await checkResetEligibility();
});

// ======================
// Init
// ======================
async function init() {
  const games = await fetchGames();

  gameSelect.innerHTML = "";
  gameSelect.options.add(new Option("Global", "Global"));
  gameSelect.options.add(new Option("bp26 (All 5 Games)", "bp26"));

  if (games && games.length) {
    games
      .map((g) => g.id)
      .filter((id) => id !== "bp26")
      .sort()
      .forEach((id) => {
        if (id !== "bp26") gameSelect.options.add(new Option(id, id));
      });
  }

  currentGame = "Global";
  gameSelect.value = "Global";

  await loadLeaderboardForSelection();
  await checkResetEligibility();
}

init();
