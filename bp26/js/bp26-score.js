import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
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

let BP26_GAME = "unknown";
let BP26_DAY = 1;
let CURRENT_USER = "";

// Ask EVERY time a game starts
function askNameEveryLaunch() {
  let username = "";
  while (!username) {
    const name = prompt("Enter your name:");
    if (name === null) continue;
    username = (name || "").trim();
  }
  CURRENT_USER = username;
  return username;
}

// Safe doc id
function docIdFromName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

// Call this at game load (you already do this)
window.bp26Init = function ({ game, day } = {}) {
  askNameEveryLaunch();

  if (game) BP26_GAME = String(game);
  if (day) BP26_DAY = Number(day);

  // Optional override by URL ?day=2
  const params = new URLSearchParams(location.search);
  if (params.has("day")) BP26_DAY = Number(params.get("day"));

  console.log("[BP26 INIT]", { user: CURRENT_USER, game: BP26_GAME, day: BP26_DAY });
};

// Call this when game ends
window.reportScore = async function (score) {
  if (!CURRENT_USER) askNameEveryLaunch();

  const s = Number(score);
  if (!Number.isFinite(s)) {
    alert("Score must be a number.");
    return;
  }

  const nowMs = Date.now();
  const playerDocId = docIdFromName(CURRENT_USER);
  const dayField = `day${BP26_DAY}Score`; // day1Score..day5Score

  try {
    // 1) Always write raw submission (even 0)
    await addDoc(collection(db, "scores_game"), {
      name: playerDocId,
      playerName: CURRENT_USER,
      game: BP26_GAME,
      day: BP26_DAY,
      score: s,
      createdAt: nowMs
    });

    // 2) Aggregate doc
    const aggRef = doc(db, "scores_aggregate", playerDocId);
    const snap = await getDoc(aggRef);

    if (snap.exists()) {
      // IMPORTANT: force day field to exist even if s == 0
      const patch = {
        playerName: CURRENT_USER,
        updatedAt: nowMs
      };

      // If field exists or not, increment will work.
      // But to ensure the field exists even for 0, we also set it if missing.
      const current = snap.data() || {};
      if (current[dayField] === undefined) {
        // ensure it exists, then increment (0 still ok)
        patch[dayField] = 0;
      }

      // increment totals (0 is fine)
      patch.totalScore = increment(s);
      patch[dayField] = increment(s);

      await updateDoc(aggRef, patch);

    } else {
      // New doc: write fields explicitly (0 included)
      await setDoc(aggRef, {
        playerName: CURRENT_USER,
        totalScore: s,
        [dayField]: s,
        updatedAt: nowMs
      });
    }

    console.log("✅ Saved", { playerDocId, playerName: CURRENT_USER, game: BP26_GAME, day: BP26_DAY, score: s });

  } catch (err) {
    console.error("❌ Firebase error:", err);
    alert("Firebase error. Open Console (F12) and send me the red error.");
  }
};
