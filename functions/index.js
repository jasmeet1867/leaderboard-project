const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

function safeId(s) {
  return String(s || "guest")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 40);
}

/**
 * POST /submitScore
 * body: { gameId, playerName, scoreDelta, secret }
 */
exports.submitScore = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") return res.status(405).send("Use POST");

      const { gameId, playerName, scoreDelta, secret } = req.body || {};

      if (!gameId || !secret) {
        return res.status(400).json({ error: "Missing gameId/secret" });
      }

      const points = Number(scoreDelta);
      if (!Number.isFinite(points) || points <= 0) {
        return res.status(400).json({ error: "Invalid scoreDelta" });
      }

      const name = (playerName || "Guest").trim();
      const playerId = safeId(name);

      // 1) Verify credentialed game
      const gameRef = db.collection("games").doc(gameId);
      const gameSnap = await gameRef.get();
      if (!gameSnap.exists) return res.status(403).json({ error: "Game not credentialed" });

      const game = gameSnap.data();
      if (!game.enabled) return res.status(403).json({ error: "Game disabled" });
      if (game.secret !== secret) return res.status(403).json({ error: "Invalid secret" });

      // 2) Get competition round
      const compRef = db.collection("competitions").doc(gameId);
      const compSnap = await compRef.get();
      const comp = compSnap.exists ? compSnap.data() : null;
      const roundId = comp && comp.status === "OPEN" ? comp.roundId : null;

      const now = admin.firestore.FieldValue.serverTimestamp();

      const batch = db.batch();

      // 3) Aggregate leaderboard (always increments)
      const aggRef = db.collection("leaderboard_aggregate").doc(playerId);
      batch.set(aggRef, {
        name,
        lastGame: game.name || gameId,
        updatedAt: now,
        totalScore: admin.firestore.FieldValue.increment(points)
      }, { merge: true });

      // 4) Game leaderboard (only if competition open)
      if (roundId) {
        const gameDocId = `${gameId}_${roundId}_${playerId}`;
        const gameLbRef = db.collection("leaderboard_game").doc(gameDocId);

        batch.set(gameLbRef, {
          gameId,
          gameName: game.name || gameId,
          roundId,
          name,
          updatedAt: now,
          score: admin.firestore.FieldValue.increment(points)
        }, { merge: true });
      }

      await batch.commit();

      return res.json({ ok: true, gameId, playerId, pointsAdded: points, roundId });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  });
});
cd 