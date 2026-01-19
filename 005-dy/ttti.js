window.onload = () => {
  // names
  let p1 = window.prompt("1st player name? [x]", "Player1");
  if (!p1) p1 = "Player1";

  let p2 = window.prompt("2nd player name? [☺]", "Player2");
  if (!p2) p2 = "Player2";

    // ✅ save names for leaderboard
  localStorage.setItem("zatam_p1", p1);
  localStorage.setItem("zatam_p2", p2);



  while (p2 === p1) {
    p2 = window.prompt(`Enter a different name than ${p1}`, "Player2");
    if (!p2) p2 = "Player2";
  }

  // scores
  let scoreX = Number(localStorage.getItem("ttt_scoreX") || 0);
  let scoreSmiley = Number(localStorage.getItem("ttt_scoreSmiley") || 0);
  let scoreDraw = Number(localStorage.getItem("ttt_scoreDraw") || 0);

  const scoreXEl = document.getElementById("scoreX");
  const scoreSmileyEl = document.getElementById("scoreSmiley");
  const scoreDrawEl = document.getElementById("scoreDraw");
  const resetBtn = document.getElementById("resetScore");

  const turnEl = document.getElementById("turn");
  const playerEl = document.getElementById("player");
  const winEl = document.getElementById("jayaH");

  function renderScores() {
    scoreXEl.textContent = scoreX;
    scoreSmileyEl.textContent = scoreSmiley;
    scoreDrawEl.textContent = scoreDraw;

    localStorage.setItem("ttt_scoreX", scoreX);
    localStorage.setItem("ttt_scoreSmiley", scoreSmiley);
    localStorage.setItem("ttt_scoreDraw", scoreDraw);
  }

  function disableBoard() {
    document.querySelectorAll("td").forEach((td) => (td.onclick = null));
  }

  function clearBoardUI() {
    document.querySelectorAll("td").forEach((td) => {
      td.textContent = "";
      td.style.color = "";
    });
  }

  let game = new Game(p1, p2);
  renderScores();
  playerEl.textContent = game.player;

  function attachClicks() {
    document.querySelectorAll("td").forEach((td) => {
      td.onclick = () => {
        if (td.textContent) return;

        const row = Number(td.dataset.row);
        const col = Number(td.dataset.col);

        // show on UI (optional: show X uppercase)
        td.textContent = game.sym === "x" ? "X" : "☺";

        // store in board (must be "x" or "☺")
        game.turn(row, col);

        // WIN
        if (game.hasWinner()) {
          if (game.sym === "x") scoreX += 1;
          else scoreSmiley += 1;

          renderScores();
          winEl.textContent = "जयतु संस्कृतम् ।";
          turnEl.style.color = "orange";
          turnEl.textContent = `Winner: ${game.player} (${game.sym})`;

          // ✅ send winner to Firebase (ONLY ONCE)
          if (window.zatamLB?.reportWin) {
            window.zatamLB.reportWin(game.sym, game.player);
          }

          disableBoard();
          return;
        }

        // DRAW
        if (game.isDraw()) {
          scoreDraw += 1;
          renderScores();
          winEl.textContent = "Draw!";
          turnEl.style.color = "orange";
          turnEl.textContent = "Match Draw";
          disableBoard();
          return;
        }

        // NEXT
        game.nextPlayer();
        playerEl.textContent = game.player;
      };
    });
  }

  attachClicks();

  // Reset = reset ONLY the board (keep scores)
  resetBtn.onclick = () => {
        window.zatamLB?.resetRound?.();

    game = new Game(p1, p2);
    clearBoardUI();
    winEl.textContent = "";
    turnEl.style.color = "";

    // restore original heading + player text
    turnEl.innerHTML = `कस्य kasya पर्यायः paryaayaH ? - <span id="player"></span> !`;
    document.getElementById("player").textContent = game.player;

    attachClicks();
  };
};
