// app.js (type="module")

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

// ✅ CHANGE THIS to match your Firestore game document under zat-am
// Examples: "002", "Rock Paper Scissors", "002-rps" — must match EXACTLY
const GAME_ID = "Rock Paper Scissors";


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
let playerDocId = "Guest"; // ✅ In your DB, doc id itself is name (e.g., "Charles McGill")

// ---------------- ASK NAME ----------------
function askName() {
  const input = prompt("Enter your name:", "Guest");
  playerName = (input && input.trim()) ? input.trim() : "Guest";

  // ✅ IMPORTANT:
  // Your leaderboard uses doc IDs as names, so KEEP it readable.
  // Firestore doc IDs allow spaces, so we can use the name directly.
  playerDocId = playerName;

  if (userLabelDiv) userLabelDiv.innerHTML = `${playerName}<br>mama<br>मम`;

  console.log("Player:", playerName, "DocID:", playerDocId, "Game:", GAME_ID);
}

// ---------------- FIRESTORE: ADD WIN (+1) ----------------
// ✅ updates BOTH:
// 1) Global leaderboard: zat-am / Global / players / {playerDocId}
// 2) Game leaderboard:   zat-am / {GAME_ID} / players / {playerDocId}
async function addWinToFirestore() {
  try {
    const now = Date.now();

    // 1) ✅ GLOBAL players
    const globalPlayerRef = doc(db, "zat-am", "Global", "players", playerDocId);

    await setDoc(
      globalPlayerRef,
      {
        totalScore: increment(1),
        lastPlayed: now
      },
      { merge: true }
    );

    // 2) ✅ PER-GAME players
    const gamePlayerRef = doc(db, "zat-am", GAME_ID, "players", playerDocId);

    await setDoc(
      gamePlayerRef,
      {
        totalScore: increment(1),
        lastPlayed: now
      },
      { merge: true }
    );

    console.log("✅ Updated Global + Game players");
  } catch (error) {
    console.error("❌ Firestore update failed:", error);
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

  // ✅ Save +1 in Firestore
  addWinToFirestore();
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
function toDevanagariDigits(num) {
  return String(num)
    .replace(/0/g,"०").replace(/1/g,"१").replace(/2/g,"२").replace(/3/g,"३").replace(/4/g,"४")
    .replace(/5/g,"५").replace(/6/g,"६").replace(/7/g,"७").replace(/8/g,"८").replace(/9/g,"९");
}

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

  userScore_span.innerHTML = toDevanagariDigits(userScore);
  computerScore_span.innerHTML = toDevanagariDigits(computerScore);
}

function main() {
  rock_div.addEventListener("click", () => game("r"));
  paper_div.addEventListener("click", () => game("p"));
  scissors_div.addEventListener("click", () => game("s"));
}

// ✅ Start
askName();
main();
