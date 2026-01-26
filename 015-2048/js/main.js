// js/main.js

// ---------- Leaderboard Integration (2048) ----------
// We will NOT use firebase compat here anymore.
// We will submit to new leaderboard via score-submit.js

import { submitScore } from "../../score-submit.js"; 
// ⚠️ If this path is wrong, change it based on your folder structure.
// Example alternatives:
// import { submitScore } from "../score-submit.js";
// import { submitScore } from "./score-submit.js";

window.__playerName = null;
window.__winAwarded2048 = false;

// ✅ GAME ID must match your leaderboard dropdown ID for this game
const GAME_ID = "015-2048";

// Ask login name once
function askLoginName2048() {
  const input = prompt("Enter your login name:", "Guest");
  const name = (input && input.trim()) ? input.trim() : "Guest";
  window.__playerName = name;
  console.log("2048 player:", name);
}

// ✅ called once when user wins (2048 tile reached)
async function awardWin2048() {
  if (window.__winAwarded2048) return;
  window.__winAwarded2048 = true;

  try {
    // +500 when WIN happens (same as your old code)
    await submitScore(GAME_ID, window.__playerName || "Guest", 500);
    console.log("✅ 2048 win: +500 submitted to leaderboard");
  } catch (e) {
    console.error("❌ 2048 win submit failed:", e);
  }
}

// Make it callable from view.js (same as before)
window.awardWin2048 = awardWin2048;

// -------------------- GAME START --------------------
on(window, "load", function () {
  askLoginName2048();

  var view = new View();
  var game = new Game();
  game.init(view);
  event(game);
});
