// ttt-firebase.js
import { submitScore } from "../score-submit.js";

const GAME_ID = "dvandvayuddham"; // any id you want for this game
const POINTS_PER_WIN = 1;

// Try to get names from localStorage, otherwise ask once
function getName(key, label) {
  let v = localStorage.getItem(key);
  if (!v || !v.trim()) {
    v = prompt(`Enter name for ${label}:`, "Guest") || "Guest";
    v = v.trim() || "Guest";
    localStorage.setItem(key, v);
  }
  return v;
}

// OPTIONAL: if your login team later stores username somewhere,
// you can replace this with that value.
const playerXName = getName("ttt_player_x", "Player 1 (X)");
const playerSmileyName = getName("ttt_player_smiley", "Player 2 (☺)");

// Keep last scores so we only submit once per win
let lastX = Number(document.getElementById("scoreX")?.textContent || 0);
let lastS = Number(document.getElementById("scoreSmiley")?.textContent || 0);

// Watch score changes
function checkScoresAndSubmit() {
  const xEl = document.getElementById("scoreX");
  const sEl = document.getElementById("scoreSmiley");
  if (!xEl || !sEl) return;

  const nowX = Number(xEl.textContent || 0);
  const nowS = Number(sEl.textContent || 0);

  // If X score increased, X won round(s)
  if (nowX > lastX) {
    const diff = nowX - lastX;
    // submit 1 point per win (or diff * POINTS_PER_WIN if multiple)
    submitScore(GAME_ID, playerXName, diff * POINTS_PER_WIN);
    lastX = nowX;
  }

  // If Smiley score increased, Smiley won round(s)
  if (nowS > lastS) {
    const diff = nowS - lastS;
    submitScore(GAME_ID, playerSmileyName, diff * POINTS_PER_WIN);
    lastS = nowS;
  }
}

// Run every 500ms (simple + reliable)
setInterval(checkScoresAndSubmit, 500);

// Also run immediately
checkScoresAndSubmit();
