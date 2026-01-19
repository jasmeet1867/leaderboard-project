import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs
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

function setRow(i, name, score) {
  document.getElementById(`hp${i}Name`).textContent = name ?? "—";
  document.getElementById(`hp${i}Score`).textContent = score ?? 0;
}

async function loadTop3() {
  try {
    // MUST match your working leaderboard page:
    // collection: "leaderboard"
    // fields: name, totalscore
    const q = query(collection(db, "leaderboard"), orderBy("totalscore", "desc"), limit(3));
    const snap = await getDocs(q);

    const list = [];
    snap.forEach(d => list.push(d.data()));

    setRow(1, list[0]?.name, list[0]?.totalscore);
    setRow(2, list[1]?.name, list[1]?.totalscore);
    setRow(3, list[2]?.name, list[2]?.totalscore);
  } catch (err) {
    console.error("Homepage leaderboard fetch failed:", err);
  }
}

loadTop3();
