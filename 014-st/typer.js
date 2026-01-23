/* global canvas ctx animation:writable gameLoop label loop paintCircle isIntersectingRectangleWithCircle generateRandomNumber generateRandomCharCodeNum paintParticles createParticles processParticles Sanscript */

let score = 0;
let lives = 10;
let caseSensitive = true;

// -------------------- PLAYER (name) --------------------
let playerName = "Guest";
let playerId = "guest";

function askName() {
  const input = prompt("Enter your name:", "Guest");
  playerName = (input && input.trim()) ? input.trim() : "Guest";

  // Match your existing firestore doc ids: "guest", "jessie", "player1"
  playerId = playerName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (!playerId) playerId = "guest";

  console.log("Typer Player:", playerName, "DocID:", playerId);
}

// -------------------- FIREBASE INIT (compat) --------------------
let db = null;

function initFirebase() {
  // firebase-app-compat + firestore-compat must be loaded in index.html
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
    console.error("Firebase scripts not loaded. Did you add firebase-app-compat.js and firebase-firestore-compat.js?");
    return;
  }

  // Prevent duplicate init if other games also initialize Firebase
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  db = firebase.firestore();
}

// Increment totalScore by 1 on every correct key
async function addPointToFirebase() {
  if (!db) return; // if firebase failed, game still works locally

  try {
    const ref = db.collection("scores_aggregate").doc(playerId);

    await ref.set(
      {
        playerName: playerName,
        totalScore: firebase.firestore.FieldValue.increment(1),
        updatedAt: Date.now()
      },
      { merge: true }
    );

    console.log("✅ Typer score +1 saved");
  } catch (err) {
    console.error("❌ Typer firebase write failed:", err);
  }
}

// -------------------- GAME OBJECTS --------------------
const center = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 20,
  color: "#FF6347"
};

const letter = {
  font: "35px Monospace",
  color: "#0095DD",
  width: 15,
  height: 20,
  highestSpeed: 1.6,
  lowestSpeed: 0.6,
  probability: 0.02
};

let letters = [];

ctx.font = label.font;
letter.width = ctx.measureText("0").width;

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
window.addEventListener("resize", resizeHandler);

// ✅ Start name + firebase BEFORE game loop runs
askName();
initFirebase();

loop(function (frames) {
  paintCircle(center.x, center.y, center.radius, center.color);

  ctx.font = letter.font;
  ctx.fillStyle = letter.color;
  for (const l of letters) {
    ctx.fillText(Sanscript.t(String.fromCharCode(l.code), "iast", "devanagari"), l.x, l.y);
  }

  paintParticles();

  ctx.font = label.font;
  ctx.fillStyle = center.color;
  ctx.fillText("Score: " + Sanscript.t(String(score), "iast", "devanagari"), label.left, label.margin);
  ctx.fillText("Lives: " + Sanscript.t(String(lives), "iast", "devanagari"), label.right, label.margin);

  processParticles(frames);
  createLetters();
  removeLetters(frames);
});

function createLetters() {
  if (Math.random() < letter.probability) {
    const x = Math.random() < 0.5 ? 0 : canvas.width;
    const y = Math.random() * canvas.height;
    const dX = center.x - x;
    const dY = center.y - y;
    const norm = Math.sqrt(dX ** 2 + dY ** 2);
    const speed = generateRandomNumber(letter.lowestSpeed, letter.highestSpeed);

    letters.push({
      x,
      y,
      code: generateRandomCharCodeNum(caseSensitive), // you already use numbers
      speedX: (dX / norm) * speed,
      speedY: (dY / norm) * speed
    });
  }
}

function removeLetters(frames) {
  for (const l of letters) {
    if (
      isIntersectingRectangleWithCircle(
        { x: l.x, y: l.y - letter.height },
        letter.width,
        letter.height,
        center,
        center.radius
      )
    ) {
      if (--lives === 0) {
        window.alert("GAME OVER!");
        window.location.reload(false);
      } else if (lives > 0) {
        window.alert("START AGAIN!");
        letters = [];
      }
      break;
    } else {
      l.x += l.speedX * frames;
      l.y += l.speedY * frames;
    }
  }
}

function type(i, l) {
  letters.splice(i, 1);
  score++;
  createParticles(l.x, l.y);

  // ✅ Save +1 to Firebase on correct key
  addPointToFirebase();
}

function keyDownHandler(e) {
  // numbers 0..9 keycodes are 48..57
  if (animation !== undefined && e.keyCode >= 48 && e.keyCode <= 57) {
    for (let i = letters.length - 1; i >= 0; i--) {
      const l = letters[i];
      if (e.keyCode === l.code || e.keyCode + 32 === l.code) {
        type(i, l);
        return;
      }
    }
    score--; // wrong key penalty (your existing behavior)
  }
}

function keyUpHandler(e) {
  if (e.keyCode === 27) {
    if (animation === undefined) {
      animation = window.requestAnimationFrame(gameLoop);
    } else {
      window.cancelAnimationFrame(animation);
      animation = undefined;
    }
  }
}

function resizeHandler() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  center.x = canvas.width / 2;
  center.y = canvas.height / 2;
}
