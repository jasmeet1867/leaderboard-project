class Game {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    this.player = this.p1;
    this.sym = "x";
  }

  turn(row, col) {
    // IMPORTANT: keep col=0 valid
    if (col === undefined || col === null) col = row;
    this.board[row][col] = this.sym;
  }

  nextPlayer() {
    this.player = this.player === this.p1 ? this.p2 : this.p1;
    this.sym = this.sym === "x" ? "☺" : "x";
  }

  hasWinner() {
    return this.rowWin() || this.colWin() || this.diagWin();
  }

  isDraw() {
    if (this.hasWinner()) return false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === null) return false;
      }
    }
    return true;
  }

  rowWin() {
    for (let r = 0; r < 3; r++) {
      const row = this.board[r];
      if (row[0] !== null && row[0] === row[1] && row[0] === row[2]) return true;
    }
    return false;
  }

  colWin() {
    for (let c = 0; c < 3; c++) {
      const b = this.board;
      if (b[0][c] !== null && b[0][c] === b[1][c] && b[0][c] === b[2][c]) return true;
    }
    return false;
  }

  diagWin() {
    const b = this.board;
    return (
      (b[0][0] !== null && b[0][0] === b[1][1] && b[0][0] === b[2][2]) ||
      (b[0][2] !== null && b[0][2] === b[1][1] && b[0][2] === b[2][0])
    );
  }
}
