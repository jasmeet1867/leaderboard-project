// score-submit.js (shared by ALL games)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ NEW Firebase config (temporary-db-e9ace)
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

function makeId(name) {
  return (name || "Guest")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "") || "guest";
}

/**
 * ✅ submitScore
 * Writes to SAME place your leaderboard should read:
 * 1) zat-am / Global / players / {uid}     (totalScore)
 * 2) zat-am / {gameId} / players / {uid}   (score per game)
 */
export async function submitScore(gameId, username, points) {
  const cleanName = (username || "Guest").trim() || "Guest";
  const uid = makeId(cleanName);
  const safeGame = (gameId || "unknown").trim();

  // GLOBAL total leaderboard
  await setDoc(
    doc(db, "zat-am", "Global", "players", uid),
    {
      username: cleanName,
      totalScore: increment(Number(points || 0)),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  // Per-game leaderboard
  await setDoc(
    doc(db, "zat-am", safeGame, "players", uid),
    {
      username: cleanName,
      totalScore: increment(Number(points || 0)), // keep same field name for easy sorting
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
