// scoreboard.js (Game 005 - TicTacToe)

(function () {
  // Load scores
  let scoreX = Number(localStorage.getItem("ttt_scoreX") || 0);
  let scoreSmiley = Number(localStorage.getItem("ttt_scoreSmiley") || 0);
  let scoreDraw = Number(localStorage.getItem("ttt_scoreDraw") || 0);

  // Prevent double scoring for the same round
  let roundFinished = false;

  function renderScores() {
    const xEl = document.getElementById("scoreX");
    const sEl = document.getElementById("scoreSmiley");
    const dEl = document.getElementById("scoreDraw");

    if (!xEl || !sEl || !dEl) return;

    xEl.textContent = scoreX;
    sEl.textContent = scoreSmiley;
    dEl.textContent = scoreDraw;

    localStorage.setItem("ttt_scoreX", scoreX);
    localStorage.setItem("ttt_scoreSmiley", scoreSmiley);
    localStorage.setItem("ttt_scoreDraw", scoreDraw);
  }

  function getBoard() {
    // Your cells are <td class="row col"></td>
    // We'll just read them in row-major order (9 cells)
    const cells = Array.from(document.querySelectorAll("table td"));
    if (cells.length < 9) return null;

    // Normalize cell values: "X", "☺" or ""
    return cells.slice(0, 9).map((td) => (td.textContent || "").trim());
  }

  function winnerFromBoard(b) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],            // diagonals
    ];

    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; // "X" or "☺" (or maybe "O")
    }

    // Draw if all filled and no winner
    const full = b.every((v) => v !== "");
    if (full) return "DRAW";

    return null;
  }

  function afterMoveCheck() {
    if (roundFinished) return;

    const board = getBoard();
    if (!board) return;

    const result = winnerFromBoard(board);
    if (!result) return;

    roundFinished = true;

    if (result === "X") {
      scoreX += 1;
    } else if (result === "☺" || result === "O") {
      scoreSmiley += 1;
    } else if (result === "DRAW") {
      scoreDraw += 1;
    }

    renderScores();
  }

  window.addEventListener("DOMContentLoaded", () => {
    renderScores();

    // Make reset button work
    const resetBtn = document.getElementById("resetScore");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        scoreX = 0;
        scoreSmiley = 0;
        scoreDraw = 0;
        roundFinished = false;
        renderScores();
      });
    }

    // Re-check after each click on the board.
    // Use capture + setTimeout so it runs AFTER the game writes X/☺ into the cell.
    const table = document.querySelector("table");
    if (table) {
      table.addEventListener(
        "click",
        () => setTimeout(afterMoveCheck, 0),
        true
      );
    }

    // Also: if your game resets the board (clears cells), we should allow new round scoring.
    // We'll watch the table for changes; when board becomes empty, unlock scoring.
    const obs = new MutationObserver(() => {
      const b = getBoard();
      if (!b) return;
      const allEmpty = b.every((v) => v === "");
      if (allEmpty) roundFinished = false;
    });

    if (table) obs.observe(table, { childList: true, subtree: true, characterData: true });
  });
})();
