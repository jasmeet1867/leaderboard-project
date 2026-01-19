import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
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

const rowsEl = document.getElementById("rows");
const podiumEl = document.getElementById("podium");
const refreshBtn = document.getElementById("refreshBtn");

refreshBtn?.addEventListener("click", loadLeaderboard);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(v) {
  try {
    if (!v) return "-";
    if (typeof v.toDate === "function") return v.toDate().toLocaleString();
    return new Date(v).toLocaleString();
  } catch {
    return "-";
  }
}

function renderPodium(list) {
  if (!podiumEl) return; 

  const top3 = list.slice(0, 3);
  const slots = [
    { cls: "gold", label: "🥇 #1" },
    { cls: "silver", label: "🥈 #2" },
    { cls: "bronze", label: "🥉 #3" },
  ];

  podiumEl.innerHTML = slots.map((s, i) => {
    const p = top3[i];
    if (!p) {
      return `<div class="box ${s.cls}">
        <div class="rank">${s.label}</div>
        <div class="name">—</div>
        <div class="score">0</div>
        <div class="game">-</div>
      </div>`;
    }

    return `<div class="box ${s.cls}">
      <div class="rank">${s.label}</div>
      <div class="name">${escapeHtml(p.playerName)}</div>
      <div class="score">${p.totalScore ?? 0}</div>
      <div class="game">${fmtDate(p.updatedAt)}</div>
    </div>`;
  }).join("");
}

async function loadLeaderboard() {
  if (rowsEl) {
    rowsEl.innerHTML = `<tr><td colspan="5" class="muted">Loading...</td></tr>`;
  }

  const q = query(
    collection(db, "scores_aggregate"),
    orderBy("totalScore", "desc"),
    limit(50)
  );

  const snap = await getDocs(q);

  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

  renderPodium(list);

  if (!rowsEl) return;

  if (list.length === 0) {
    rowsEl.innerHTML = `<tr><td colspan="5" class="muted">No scores yet.</td></tr>`;
    return;
  }

  rowsEl.innerHTML = list.map((p, idx) => {
    const rank = idx + 1;
    return `<tr>
      <td>${rank}</td>
      <td>${escapeHtml(p.playerName)}</td>
      <td><b>${p.totalScore ?? 0}</b></td>
      <td>All Games</td>
      <td>${fmtDate(p.updatedAt)}</td>
    </tr>`;
  }).join("");
}

loadLeaderboard();
