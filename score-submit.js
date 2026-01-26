// score-submit.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ YOUR NEW PROJECT: temporary-db-e9ace
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

// ✅ EXACT doc names you are using in Firestore (match spelling/spaces)
const BP26_GAMES = new Set([
  "Game 005",
  "GAME 014",
  "GAME 015",
  "GAME 026-SP",
  "Rock Paper Scissors"
]);

function toPlayerId(name) {
  return (name || "guest")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "") || "guest";
}

/**
 * Writes score to:
 * - zat-am/<gameDocId>/players/<playerId>
 * - if gameDocId is one of BP26_GAMES, also writes to zat-am/bp26/players/<playerId>
 */
export async function submitScore(gameDocId, username, points = 1) {
  const gameId = (gameDocId || "").trim();
  const name = (username || "Guest").trim() || "Guest";
  const pts = Number(points) || 0;

  if (!gameId || pts === 0) return;

  const playerId = toPlayerId(name);

  const perGameRef = doc(db, "zat-am", gameId, "players", playerId);

  // 🔥 this one is your bp26 aggregate leaderboard
  const bp26Ref = doc(db, "zat-am", "bp26", "players", playerId);

  const payload = {
    username: name,                 // ✅ leaderboard reads this
    totalScore: increment(pts),     // ✅ leaderboard reads this
    updatedAt: serverTimestamp()
  };

  // always write per-game
  const writes = [setDoc(perGameRef, payload, { merge: true })];

  // write bp26 aggregate ONLY for the 5 bp26 games
  if (BP26_GAMES.has(gameId)) {
    writes.push(setDoc(bp26Ref, payload, { merge: true }));
  }

  await Promise.all(writes);
}
