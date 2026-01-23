import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5-cHjL5iL8Arjqv2Pt2WecT8RTLw3Weg",
  authDomain: "zatam-leaderboard.firebaseapp.com",
  projectId: "zatam-leaderboard",
  storageBucket: "zatam-leaderboard.firebasestorage.app",
  messagingSenderId: "1053027312775",
  appId: "1:1053027312775:web:43325a831ab077d017c422",
  measurementId: "G-KP78X2DN6L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PER_PAGE = 10;
let currentPage = 1;
let cachedRows = [];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function fmtDate(ms) {
  if (!ms) return "—";
  try { return new Date(ms).toLocaleString(); } catch { return "—"; }
}

function getTimeCutoff(filter) {
  const now = new Date();
  if (filter === "week") return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (filter === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (filter === "year") return new Date(now.getFullYear(), 0, 1).getTime();
  return null;
}

function renderPodium(top3, scopeLabel, scoreField) {
  const podium = document.getElementById("podium");
  if (!podium) return;

  const first = top3[0] || null;
  const second = top3[1] || null;
  const third = top3[2] || null;

  const box = (rank, cls, p) => `
    <div class="box ${cls}">
      <div class="rank">#${rank}</div>
      <div class="name">${esc(p?.playerName || "—")}</div>
      <div class="score">${esc(p?.[scoreField] ?? 0)}</div>
      <div class="game">Scope: ${esc(scopeLabel)}</div>
    </div>
  `;

  podium.innerHTML =
    box(2, "silver", second) +
    box(1, "gold", first) +
    box(3, "bronze", third);
}

function renderList(rows, scoreField, dateField = "updatedAt") {
  const list = document.getElementById("leaderboard");
  if (!list) return;

  if (!rows.length) {
    list.innerHTML = `<div class="muted">No players found.</div>`;
    return;
  }

  const startIndex = (currentPage - 1) * PER_PAGE;
  const pageRows = rows.slice(startIndex, startIndex + PER_PAGE);

  list.innerHTML = pageRows.map((p, idx) => {
    const rank = startIndex + idx + 1;
    const dt = p?.[dateField] ?? p?.updatedAt ?? p?.createdAt ?? 0;

    return `
      <div class="row" style="
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 12px; border-top:1px solid #f2f2f2;
      ">
        <div style="display:flex; gap:14px; align-items:center;">
          <div style="font-weight:900; width:48px;">#${rank}</div>
          <div style="font-weight:800;">${esc(p.playerName || p.name || "—")}</div>
        </div>

        <div style="display:flex; gap:18px; align-items:center;">
          <div style="font-weight:900;">${esc(p?.[scoreField] ?? 0)}</div>
          <div style="color:#777; font-size:12px; white-space:nowrap;">${esc(fmtDate(dt))}</div>
        </div>
      </div>
    `;
  }).join("");
}

function updatePager() {
  const pageNum = document.getElementById("pageNum");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const totalPages = Math.max(1, Math.ceil(cachedRows.length / PER_PAGE));

  if (pageNum) pageNum.textContent = String(currentPage);
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ---------- BP26 helpers ----------
function isBP26Selection(gameVal) {
  return gameVal === "bp26-all" || /^bp26-g[1-5]$/.test(gameVal);
}

function bp26ScoreField(gameVal) {
  if (gameVal === "bp26-all") return "bp26Total";
  const dayNum = Number(gameVal.replace("bp26-g", ""));
  return `day${dayNum}Score`;
}

function computeBp26Total(row) {
  return Number(row.day1Score || 0) +
    Number(row.day2Score || 0) +
    Number(row.day3Score || 0) +
    Number(row.day4Score || 0) +
    Number(row.day5Score || 0);
}

// ---------- main loader ----------
async function loadScores() {
  const game = document.getElementById("gameSelect")?.value || "aggregate";
  const time = document.getElementById("timeFilter")?.value || "all";
  const cutoff = getTimeCutoff(time);

  const list = document.getElementById("leaderboard");
  if (list) list.innerHTML = `<div class="muted">Loading...</div>`;

  try {
    let rows = [];
    let scopeLabel = "";
    let scoreField = "";
    let dateField = "updatedAt";

    // ====== Aggregate ======
    if (game === "aggregate") {
      scopeLabel = "All Games";
      scoreField = "totalScore";
      dateField = "updatedAt";

      const qAgg = query(
        collection(db, "scores_aggregate"),
        orderBy("totalScore", "desc"),
        limit(1000)
      );
      const snap = await getDocs(qAgg);
      rows = snap.docs.map(d => d.data());
    }

    // ====== BP26 days/all (from scores_aggregate) ======
    else if (isBP26Selection(game)) {
      scoreField = bp26ScoreField(game);
      scopeLabel =
        (game === "bp26-all") ? "BP26 (All 5 Days)" :
          `BP26 Day ${game.replace("bp26-g", "")}`;

      const snap = await getDocs(query(
        collection(db, "scores_aggregate"),
        limit(1000)
      ));

      rows = snap.docs.map(d => d.data()).map(r => ({
        ...r,
        bp26Total: computeBp26Total(r)
      }));

      // ✅ IMPORTANT: do NOT filter out 0 scores
      // Show anyone who has the field present OR is part of BP26 total
      rows = rows.filter(r => {
        if (game === "bp26-all") return true;
        return r?.[scoreField] !== undefined;
      });

      // sort desc by chosen field
      rows.sort((a, b) => Number(b?.[scoreField] ?? 0) - Number(a?.[scoreField] ?? 0));

      dateField = "updatedAt";
    }

    // ====== Other per-game ======
    else {
      scopeLabel = `Game ${game}`;
      scoreField = "score";
      dateField = "createdAt";

      // gameId first
      let snap = await getDocs(query(
        collection(db, "scores_game"),
        where("gameId", "==", game),
        limit(1000)
      ));

      // fallback to "game"
      if (snap.empty) {
        snap = await getDocs(query(
          collection(db, "scores_game"),
          where("game", "==", game),
          limit(1000)
        ));
      }

      rows = snap.docs.map(d => d.data()).map(r => ({
        ...r,
        playerName: r.playerName || r.name || "—"
      }));

      rows.sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0));
    }

    // time filter client-side
    if (cutoff !== null) {
      rows = rows.filter(r => Number(r.updatedAt ?? r.createdAt ?? 0) >= cutoff);
    }

    cachedRows = rows;

    renderPodium(cachedRows.slice(0, 3), scopeLabel, scoreField);

    const totalPages = Math.max(1, Math.ceil(cachedRows.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    renderList(cachedRows, scoreField, dateField);
    updatePager();

  } catch (err) {
    console.error("Firestore error:", err);
    if (list) list.innerHTML = `<div class="muted">Firestore error. Check console.</div>`;
  }
}

function resetAndLoad() {
  currentPage = 1;
  loadScores();
}

// events
const refreshBtn = document.getElementById("refreshBtn");
const gameSelect = document.getElementById("gameSelect");
const timeFilter = document.getElementById("timeFilter");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

if (refreshBtn) refreshBtn.addEventListener("click", resetAndLoad);
if (gameSelect) gameSelect.addEventListener("change", resetAndLoad);
if (timeFilter) timeFilter.addEventListener("change", resetAndLoad);

if (nextBtn) nextBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(cachedRows.length / PER_PAGE));
  if (currentPage < totalPages) {
    currentPage++;
    const gv = gameSelect?.value || "aggregate";
    const sf = gv === "aggregate" ? "totalScore" : (isBP26Selection(gv) ? bp26ScoreField(gv) : "score");
    renderList(cachedRows, sf, (gv === "aggregate" || isBP26Selection(gv)) ? "updatedAt" : "createdAt");
    updatePager();
  }
});

if (prevBtn) prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    const gv = gameSelect?.value || "aggregate";
    const sf = gv === "aggregate" ? "totalScore" : (isBP26Selection(gv) ? bp26ScoreField(gv) : "score");
    renderList(cachedRows, sf, (gv === "aggregate" || isBP26Selection(gv)) ? "updatedAt" : "createdAt");
    updatePager();
  }
});

// initial
resetAndLoad();
