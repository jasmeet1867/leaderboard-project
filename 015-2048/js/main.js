// ---------- Leaderboard Integration (2048) ----------
window.__playerName = null;
window.__playerId = null;
window.__winAwarded2048 = false;
window.__db = null;

function askLoginName2048() {
  const input = prompt("Enter your login name:", "Guest");
  const name = (input && input.trim()) ? input.trim() : "Guest";

  // doc id like "guest", "jessie"
  const id = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") || "guest";

  window.__playerName = name;
  window.__playerId = id;

  console.log("2048 player:", name, "doc:", id);
}

function initFirebase2048() {
  const firebaseConfig = {
    apiKey: "AIzaSyA5-cHjL5iL8Arjqv2Pt2WecT8RTLw3Weg",
    authDomain: "zatam-leaderboard.firebaseapp.com",
    projectId: "zatam-leaderboard",
    storageBucket: "zatam-leaderboard.firebasestorage.app",
    messagingSenderId: "1053027312775",
    appId: "1:1053027312775:web:43325a831ab077d017c422",
    measurementId: "G-KP78X2DN6L"
  };

  if (!window.firebase) {
    console.error("Firebase compat scripts not loaded.");
    return;
  }

  // Prevent duplicate init if other games init Firebase too
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  window.__db = firebase.firestore();
}

async function awardWin2048() {
  // prevent multiple +500 awards
  if (window.__winAwarded2048) return;
  window.__winAwarded2048 = true;

  if (!window.__db) return;

  try {
    const ref = window.__db.collection("scores_aggregate").doc(window.__playerId);

    await ref.set(
      {
        playerName: window.__playerName,
        totalScore: firebase.firestore.FieldValue.increment(500),
        updatedAt: Date.now()
      },
      { merge: true }
    );

    console.log("✅ 2048 win: +500 saved");
  } catch (e) {
    console.error("❌ 2048 win save failed:", e);
  }
}

// Make it callable from view.js
window.awardWin2048 = awardWin2048;

// -------------------- GAME START --------------------
on(window, 'load', function () {
  askLoginName2048();
  initFirebase2048();

  var view = new View();
  var game = new Game();
  game.init(view);
  event(game);
});
