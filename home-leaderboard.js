import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ temporary-db-e9ace (same as big leaderboard)
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

function setRow(i, name, score) {
  document.getElementById(`p${i}Name`).textContent = name ?? "—";
  document.getElementById(`p${i}Score`).textContent = (score ?? 0).toLocaleString();
}

async function loadTop3() {
  try {
    // ✅ Read from: zat-am / Global / players
    // Order by totalScore (matches your Firestore field)
    const qTop = query(
      collection(db, "zat-am", "Global", "players"),
      orderBy("totalScore", "desc"),
      limit(3)
    );

    const snap = await getDocs(qTop);

    const top = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      top.push({
        // ✅ NAME comes from doc ID if username not stored
        name: data.username ?? docSnap.id,
        totalScore: Number(data.totalScore ?? 0)
      });
    });

    setRow(1, top[0]?.name, top[0]?.totalScore);
    setRow(2, top[1]?.name, top[1]?.totalScore);
    setRow(3, top[2]?.name, top[2]?.totalScore);
  } catch (err) {
    console.error("Mini leaderboard failed:", err);
    setRow(1, "—", 0);
    setRow(2, "—", 0);
    setRow(3, "—", 0);
  }
}

loadTop3();
