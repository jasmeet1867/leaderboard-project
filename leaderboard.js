// leaderboard.js (FULL FILE)
// - Global = reads zat-am/Global/players
// - bp26 = aggregate of bp26-Game1..bp26-Game5
// - Individual games = zat-am/{gameId}/players
// - No Firestore orderBy (sort in JS)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  setDoc
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

// ======================
// Helpers
// ======================
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toMillisMaybe(ts) {
  // Firestore Timestamp has toMillis()
  if (ts && typeof ts.toMillis === "function") return ts.toMillis();
  return ts;
}

function normalizePlayerDoc(docId, data) {
  const username = String(
    data.username ?? data.playerName ?? data.name ?? docId ?? "unknown"
  ).trim() || String(docId || "unknown");

  const totalScore = toNum(data.totalScore ?? data.score ?? data.total ?? 0);

  let lastPlayed = data.lastPlayed ?? data.last_played ?? data.updatedAt ?? 0;
  lastPlayed = toNum(toMillisMaybe(lastPlayed));

  return { id: docId, username, totalScore, lastPlayed };
}

// ======================
// Firestore fetch
// ======================
async function fetchGames() {
  const snap = await getDocs(collection(db, "zat-am"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchPlayers(gameId) {
  const playersCol = collection(db, "zat-am", gameId, "players");
  const snap = await getDocs(playersCol);

  const list = snap.docs.map((d) => normalizePlayerDoc(d.id, d.data()));
  list.sort((a, b) => b.totalScore - a.totalScore);
  return list;
}

async function fetchPlayersAggregated(gameIds) {
  const map = new Map(); // username -> {username,totalScore,lastPlayed}

  for (const gid of gameIds) {
    try {
      const players = await fetchPlayers(gid);

      for (const p of players) {
        const key = String(p.username || p.id || "").trim();
        if (!key) continue;

        const prev = map.get(key) || { username: key, totalScore: 0, lastPlayed: 0 };
        prev.totalScore += toNum(p.totalScore);
        prev.lastPlayed = Math.max(prev.lastPlayed, toNum(p.lastPlayed));
        map.set(key, prev);
      }
    } catch (err) {
      console.error("Aggregate fetch failed for:", gid, err);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
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
// Chart.js
// ======================
const lineGraph = document.getElementById("line-graph");
let myChart = null;

function ensureChart() {
  if (!lineGraph || myChart) return;

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
    await setDoc(doc(db, "zat-am", gameId), { competitionIsActive: newState }, { merge: true });
    await checkResetEligibility();
  } catch (err) {
    console.error("Update failed:", err);
    statusToggle.checked = !newState;
    alert("Database update failed.");
  }
});

async function performReset(gameId) {
  if (gameId === "bp26") {
    alert("bp26 is aggregate. Reset one of: bp26-Game1..bp26-Game5");
    return;
  }

  if (!confirm(`Are you sure you want to clear leaderboard for [${gameId}]?`)) return;

  const playersColRef = collection(db, "zat-am", gameId, "players");
  const historyColRef = collection(db, "zat-am", gameId, "gameHistory");

  const [playersSnap, historySnap] = await Promise.all([
    getDocs(playersColRef),
    getDocs(historyColRef)
  ]);

  if (playersSnap.empty && historySnap.empty) {
    alert("Leaderboard is already cleared.");
    return;
  }

  const batch = writeBatch(db);
  playersSnap.forEach((docu) => batch.delete(docu.ref));
  historySnap.forEach((docu) => batch.delete(docu.ref));

  try {
    await batch.commit();
    alert(`Successfully reset ${gameId} leaderboard.`);
    playersData = [];
    currentPage = 1;
    render();
    renderChartFromPlayers(playersData);
  } catch (error) {
    console.error("Reset failed:", error);
    alert("Error resetting leaderboard. Check console.");
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
// Filters
// ======================
gameSelect?.addEventListener("change", async (e) => {
  currentGame = e.target.value;
  currentPage = 1;

  try {
    if (currentGame === "bp26") {
      playersData = await fetchPlayersAggregated([
        "bp26-Game1",
        "bp26-Game2",
        "bp26-Game3",
        "bp26-Game4",
        "bp26-Game5"
      ]);
    } else {
      playersData = await fetchPlayers(currentGame);
    }

    render();
    renderChartFromPlayers(playersData);

    await syncToggleStatus(currentGame);
    await checkResetEligibility();
  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load leaderboard data. Check console (F12).");
  }
});

timeSelect?.addEventListener("change", () => render());

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
      .filter((id) => id !== "Global" && id !== "bp26")
      .sort()
      .forEach((id) => gameSelect.options.add(new Option(id, id)));
  }

  currentGame = "Global";
  gameSelect.value = "Global";

  playersData = await fetchPlayers("Global");

  render();
  renderChartFromPlayers(playersData);

  await syncToggleStatus(currentGame);
  await checkResetEligibility();
}

init();
