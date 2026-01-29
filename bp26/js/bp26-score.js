// js/bp26-score.js (FULL FILE - COPY/PASTE)
// ✅ Prompt ONLY at game start using bp26PromptName()
// ✅ reportScore() NEVER prompts (even if username missing)
// ✅ Writes to:
// 1) zat-am/{gameId}/players
// 2) zat-am/{gameId}/seasons/{YYYY-MM-DD}/players
// 3) zat-am/Global/players
// 4) zat-am/Global/seasons/{YYYY-MM-DD}/players
// 5) gameHistory + seasons/{dayId}/gameHistory (dayId included)

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwqOOawElTcsBIAmJQIkZYs-W-h8kJx7A",
  authDomain: "temporary-db-e9ace.firebaseapp.com",
  databaseURL: "https://temporary-db-e9ace-default-rtdb.firebaseio.com",
  projectId: "temporary-db-e9ace",
  storageBucket: "temporary-db-e9ace.firebasestorage.app",
  messagingSenderId: "810939107125",
  appId: "1:810939107125:web:25edc649d354c1ca0bee7c"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// --------------------
// State
// --------------------
let CURRENT_GAME_ID = null;

// ✅ In-memory cache (prevents double prompting in same page load)
let CACHED_USERNAME = "";

// --------------------
// Helpers
// --------------------
function dayIdFromDate(d = new Date()) {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function cleanName(s) {
  return String(s ?? "").trim();
}

function playerDocIdFromUsername(username) {
  return cleanName(username).toLowerCase().replace(/\s+/g, "_").slice(0, 60) || "unknown";
}

// ✅ PROMPT ONLY (NO FIRESTORE WRITE)
export function bp26PromptName({ force = false } = {}) {
  if (force) {
    try { localStorage.removeItem("bp26_username"); } catch (e) {}
    CACHED_USERNAME = "";
  }

  // cached
  if (CACHED_USERNAME) return CACHED_USERNAME;

  // localStorage
  let saved = "";
  try { saved = cleanName(localStorage.getItem("bp26_username")); } catch (e) {}
  if (saved) {
    CACHED_USERNAME = saved;
    return saved;
  }

  // prompt
  let name = "";
  while (!name) {
    name = prompt("Enter your name for the leaderboard:");
    if (name === null) name = "";
    name = cleanName(name);
  }

  try { localStorage.setItem("bp26_username", name); } catch (e) {}
  CACHED_USERNAME = name;
  return name;
}

// ✅ NO PROMPT — used by reportScore
function getUsernameNoPrompt() {
  if (CACHED_USERNAME) return CACHED_USERNAME;

  let saved = "";
  try { saved = cleanName(localStorage.getItem("bp26_username")); } catch (e) {}
  if (saved) {
    CACHED_USERNAME = saved;
    return saved;
  }

  // ✅ NEVER prompt here
  return "unknown";
}

// --------------------
// Public API
// --------------------
export function bp26Init({ game }) {
  CURRENT_GAME_ID = game;

  if (!CURRENT_GAME_ID) {
    console.warn("bp26Init called without game id");
    return;
  }

  try { localStorage.setItem("bp26_last_game", CURRENT_GAME_ID); } catch (e) {}
}

export async function reportScore(score) {
  const gameId =
    CURRENT_GAME_ID ||
    cleanName((() => {
      try { return localStorage.getItem("bp26_last_game"); } catch (e) { return ""; }
    })());

  if (!gameId) throw new Error("bp26Init({ game: 'bp26-GameX' }) was not called.");

  // ✅ NEVER prompts
  const username = getUsernameNoPrompt();
  const pid = playerDocIdFromUsername(username);
  const points = Number(score) || 0;

  const now = Date.now();
  const dayId = dayIdFromDate(new Date());

  // --------------------
  // Refs
  // --------------------
  const gamePlayersRef = doc(db, "zat-am", gameId, "players", pid);
  const gameHistoryCol = collection(db, "zat-am", gameId, "gameHistory");

  const gameSeasonPlayersRef = doc(db, "zat-am", gameId, "seasons", dayId, "players", pid);
  const gameSeasonHistoryCol = collection(db, "zat-am", gameId, "seasons", dayId, "gameHistory");

  const globalPlayersRef = doc(db, "zat-am", "Global", "players", pid);
  const globalHistoryCol = collection(db, "zat-am", "Global", "gameHistory");

  const globalSeasonPlayersRef = doc(db, "zat-am", "Global", "seasons", dayId, "players", pid);
  const globalSeasonHistoryCol = collection(db, "zat-am", "Global", "seasons", dayId, "gameHistory");

  // --------------------
  // Update players (batch)
  // --------------------
  const batch = writeBatch(db);

  batch.set(gamePlayersRef, {
    username,
    totalScore: increment(points),
    lastPlayed: serverTimestamp(),
    lastPlayedDay: dayId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  batch.set(gameSeasonPlayersRef, {
    username,
    totalScore: increment(points),
    lastPlayed: serverTimestamp(),
    lastPlayedDay: dayId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  batch.set(globalPlayersRef, {
    username,
    totalScore: increment(points),
    lastPlayed: serverTimestamp(),
    lastPlayedDay: dayId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  batch.set(globalSeasonPlayersRef, {
    username,
    totalScore: increment(points),
    lastPlayed: serverTimestamp(),
    lastPlayedDay: dayId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();

  // --------------------
  // Add history docs
  // --------------------
  const historyPayload = {
    username,
    playerId: pid,
    gameId,
    score: points,
    timestamp: now,
    dayId
  };

  await addDoc(gameHistoryCol, historyPayload);
  await addDoc(gameSeasonHistoryCol, historyPayload);

  await addDoc(globalHistoryCol, historyPayload);
  await addDoc(globalSeasonHistoryCol, historyPayload);

  return { ok: true, username, points, gameId, dayId };
}
