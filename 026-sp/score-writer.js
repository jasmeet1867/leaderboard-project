import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

console.log("[score-writer] loaded");

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

function getPlayerName() {
  return (localStorage.getItem("playerName") || "").trim();
}
function setPlayerName(name) {
  localStorage.setItem("playerName", name);
}

/**
 * ✅ Ask player name when game starts.
 * force=true will always ask again.
 */
window.ensurePlayerName = (force = false) => {
  if (force) localStorage.removeItem("playerName");

  let name = getPlayerName();

  if (!name) {
    name = prompt("Enter your name for the leaderboard:") || "";
    name = name.trim();
    if (!name) name = "Anonymous";
    setPlayerName(name);
  }

  return name;
};

/**
 * Updates: scores_aggregate/{playerName}.totalScore += points
 */
window.awardPoints = async (points = 10) => {
  const playerName = getPlayerName() || "Anonymous";
  const aggRef = doc(db, "scores_aggregate", playerName);

  await setDoc(
    aggRef,
    {
      playerName,
      totalScore: increment(points),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};
