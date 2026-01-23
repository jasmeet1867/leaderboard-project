// app.js (type="module")

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Firebase config
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

// ✅ IMPORTANT: must match your leaderboard dropdown values exactly
// For Rock/Paper/Scissors game, set it to the correct one:
const GAME_ID = "044-gp"; // <-- change if needed (example: "002-zpk", "005-dy", etc.)

// ---------------- GAME VARIABLES ----------------
let musicOn = true;
let userScore = 0;
let computerScore = 0;

const userScore_span = document.getElementById("user-score");
const computerScore_span = document.getElementById("computer-score");
const result_p = document.querySelector(".result > p");
const rock_div = document.getElementById("r");
const paper_div = document.getElementById("p");
const scissors_div = document.getElementById("s");
const userLabelDiv = document.getElementById("user-label");

// Player info
let playerName = "Guest";
let playerId = "guest";

// ---------------- ASK NAME ----------------
function askName() {
  const input = prompt("Enter your name:", "Guest");
  playerName = (input && input.trim()) ? input.trim() : "Guest";

  // doc id like "guest", "jessie"
  playerId = playerName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (!playerId) playerId = "guest";

  if (userLabelDiv) userLabelDiv.innerHTML = `${playerName}<br>mama<br>मम`;

  console.log("Player:", playerName, "DocID:", playerId, "Game:", GAME_ID);
}

// ---------------- FIREBASE: ADD WIN (+1) ----------------
// ✅ updates BOTH aggregate + per-game
async function addWinToFirebase() {
  try {
    const now = Date.now();

    // 1) ✅ OVERALL leaderboard (scores_aggregate)
    const aggRef = doc(db, "scores_aggregate", playerId);

    await setDoc(
      aggRef,
      {
        playerName: playerName,
        totalScore: increment(1),
        updatedAt: now
      },
      { merge: true }
    );

    // 2) ✅ PER-GAME leaderboard (scores_game)
    // doc per player per game => "044-gp__jessie"
    const gameDocId = `${GAME_ID}__${playerId}`;
    const gameRef = doc(db, "scores_game", gameDocId);

    await setDoc(
      gameRef,
      {
        gameId: GAME_ID,
        playerName: playerName,
        score: increment(1),
        updatedAt: now
      },
      { merge: true }
    );

    console.log("✅ Updated: scores_aggregate + scores_game");
  } catch (error) {
    console.error("❌ Firebase update failed:", error);
  }
}

// ---------------- COMPUTER CHOICE ----------------
function computerChoice() {
  const choices = ["r", "p", "s"];
  return choices[Math.floor(Math.random() * 3)];
}

// ---------------- WIN / LOSE / DRAW ----------------
function win(userInput, compChoice) {
  userScore++; // +1 local score

  if (userInput === "r" && compChoice === "s") {
    result_p.innerHTML = `यन्त्रम् chose कर्तरी ✂. You Win ✅🎉`;
  } else if (userInput === "p" && compChoice === "r") {
    result_p.innerHTML = `यन्त्रम् chose शिलाखण्डः ⬛. You Win ✅🎉`;
  } else if (userInput === "s" && compChoice === "p") {
    result_p.innerHTML = `यन्त्रम् chose पत्रम् 📜. You Win ✅🎉`;
  }

  document.getElementById(userInput).classList.add("win");
  setTimeout(() => document.getElementById(userInput).classList.remove("win"), 350);

  // ✅ Save +1 in Firebase (aggregate + per-game)
  addWinToFirebase();
}

function lose(userInput, compChoice) {
  computerScore++;

  if (userInput === "r" && compChoice === "p") {
    result_p.innerHTML = `यन्त्रम् chose पत्रम् 📜. You Lost ❌`;
  } else if (userInput === "p" && compChoice === "s") {
    result_p.innerHTML = `यन्त्रम् chose कर्तरी ✂. You Lost ❌`;
  } else if (userInput === "s" && compChoice === "r") {
    result_p.innerHTML = `यन्त्रम् chose शिलाखण्डः ⬛. You Lost ❌`;
  }

  document.getElementById(userInput).classList.add("lose");
  setTimeout(() => document.getElementById(userInput).classList.remove("lose"), 350);
}

function draw(userInput, compChoice) {
  result_p.innerHTML = `It's a Draw.`;

  document.getElementById(userInput).classList.add("draw");
  setTimeout(() => document.getElementById(userInput).classList.remove("draw"), 350);
}

// ---------------- AUDIO ----------------
const musicelements = document.getElementsByTagName("audio");

function plysnd(evt) {
  let inp = 0;
  if (evt.target.id === "rs") inp = 0;
  if (evt.target.id === "ps") inp = 1;
  if (evt.target.id === "ss") inp = 2;

  musicelements[0].pause();
  musicelements[1].pause();
  musicelements[2].pause();

  if (musicOn === true) musicelements[inp].play();
}

document.getElementById("rs").onclick = plysnd;
document.getElementById("ps").onclick = plysnd;
document.getElementById("ss").onclick = plysnd;

const musicNode = document.getElementById("music");
musicNode.onclick = function () {
  musicOn = !musicOn;
  musicNode.innerHTML = musicOn ? "Sound On" : "Sound Off";
};

// ---------------- GAME LOOP ----------------
function game(userInput) {
  const compChoice = computerChoice();
  const combo = userInput + compChoice;

  if (combo === "rs" || combo === "pr" || combo === "sp") {
    win(userInput, compChoice);
  } else if (combo === "rp" || combo === "ps" || combo === "sr") {
    lose(userInput, compChoice);
  } else {
    draw(userInput, compChoice);
  }

  // Update scoreboard in Devanagari digits
  userScore_span.innerHTML = userScore.toString()
    .replace(/0/g,"०").replace(/1/g,"१").replace(/2/g,"२").replace(/3/g,"३").replace(/4/g,"४")
    .replace(/5/g,"५").replace(/6/g,"६").replace(/7/g,"७").replace(/8/g,"८").replace(/9/g,"९");

  computerScore_span.innerHTML = computerScore.toString()
    .replace(/0/g,"०").replace(/1/g,"१").replace(/2/g,"२").replace(/3/g,"३").replace(/4/g,"४")
    .replace(/5/g,"५").replace(/6/g,"६").replace(/7/g,"७").replace(/8/g,"८").replace(/9/g,"९");
}

function main() {
  rock_div.addEventListener("click", () => game("r"));
  paper_div.addEventListener("click", () => game("p"));
  scissors_div.addEventListener("click", () => game("s"));
}

// ✅ Start
askName();
main();
