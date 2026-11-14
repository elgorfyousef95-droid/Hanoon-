
import { supabase } from "../supabase.js";

/* =========================================
   HANOON WORLD — DOMINO ENGINE
   Local gameplay + AI + Supabase preparation
========================================= */

const $ = id => document.getElementById(id);

const state = {
  variant: "draw",
  playersCount: 2,
  playType: "ai",
  aiLevel: "medium",
  targetScore: 200,

  players: [],
  board: [],
  boneyard: [],
  excludedTile: null,

  currentTurn: 0,
  selectedTile: null,

  started: false,
  finished: false,
  busy: false,

  round: 1,
  roundPasses: 0,
  scores: [],
  lastMessage: ""
};

const PIP_POSITIONS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const ICON_CHECK = `
<svg viewBox="0 0 24 24" fill="none"
stroke="currentColor" stroke-width="2.5">
<path d="m5 12 4 4L19 6"/>
</svg>`;

/* =========================================
   UTILITIES
========================================= */

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2800);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setStatus(message, detail = "") {
  state.lastMessage = message;

  if ($("gameStatus")) {
    $("gameStatus").textContent = message;
  }

  if ($("gameStatusDetail")) {
    $("gameStatusDetail").textContent = detail;
  }
}

/* =========================================
   DOMINO GRAPHICS
========================================= */

function makePips(value) {
  const positions = PIP_POSITIONS[value] || [];

  return `
    <div class="pips">
      ${Array.from({ length: 9 }, (_, index) => `
        <i class="pip ${positions.includes(index) ? "" : "off"}"></i>
      `).join("")}
    </div>
  `;
}

function makeHalf(value) {
  const positions = PIP_POSITIONS[value] || [];

  return `
    <div class="domino-half">
      ${Array.from({ length: 9 }, (_, index) => `
        <i class="${positions.includes(index) ? "" : "off"}"></i>
      `).join("")}
    </div>
  `;
}

function makeTileHTML(a, b, vertical = false) {
  return `
    <div class="${vertical ? "domino-tile vertical" : "domino-tile"}">
      ${makeHalf(a)}
      ${makeHalf(b)}
    </div>
  `;
}

/* =========================================
   DECK AND DISTRIBUTION
========================================= */

function makeDeck() {
  const deck = [];
  let id = 0;

  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      deck.push({
        id: `domino-${++id}`,
        a,
        b
      });
    }
  }

  return deck;
}

function tilePoints(tile) {
  return tile.a + tile.b;
}

function getDealSize() {
  return state.playersCount === 3 ? 9 : 7;
}

function getDistributionDescription() {
  if (state.playersCount === 2) {
    return "7 قطع لكل لاعب، ويتبقى 14 قطعة في كومة السحب.";
  }

  if (state.playersCount === 3) {
    return "9 قطع لكل لاعب، والقطعة 0-0 مستبعدة تمامًا من اللعب.";
  }

  return "7 قطع لكل لاعب، جميع القطع موزعة ولا توجد كومة سحب.";
}

function updateDealDescription() {
  const element = $("dealDescription");

  if (element) {
    element.textContent = getDistributionDescription();
  }
}

function getPlayerNames() {
  if (state.playType === "local") {
    return [
      "اللاعب الأول",
      "اللاعب الثاني",
      "اللاعب الثالث",
      "اللاعب الرابع"
    ];
  }

  return [
    "أنت",
    "الكمبيوتر 1",
    "الكمبيوتر 2",
    "الكمبيوتر 3"
  ];
}

function createPlayers() {
  const names = getPlayerNames();

  state.players = Array.from(
    { length: state.playersCount },
    (_, index) => ({
      id: index,
      name: names[index],
      hand: [],
      score: state.scores[index] || 0,
      isHuman:
        state.playType === "local" ||
        index === 0
    })
  );
}

function dealRound() {
  let deck = shuffle(makeDeck());

  state.excludedTile = null;

  /*
    قواعد التوزيع المعتمدة:

    لاعبان:
    7 + 7 = 14
    14 قطعة للسحب.

    ثلاثة لاعبين:
    استبعاد 0-0 تحديدًا.
    9 × 3 = 27 قطعة.
    لا توجد كومة سحب.

    أربعة لاعبين:
    7 × 4 = 28 قطعة.
    لا توجد كومة سحب.
  */

  if (state.playersCount === 3) {
    const blankIndex = deck.findIndex(
      tile => tile.a === 0 && tile.b === 0
    );

    if (blankIndex !== -1) {
      state.excludedTile = deck.splice(blankIndex, 1)[0];
    }
  }

  const dealSize = getDealSize();

  state.players.forEach(player => {
    player.hand = [];
  });

  let cursor = 0;

  for (let round = 0; round < dealSize; round++) {
    for (const player of state.players) {
      player.hand.push(deck[cursor++]);
    }
  }

  if (state.playersCount === 2) {
    state.boneyard = deck.slice(cursor);
  } else {
    state.boneyard = [];
  }

  state.board = [];
  state.roundPasses = 0;
  state.selectedTile = null;
  state.finished = false;
  state.busy = false;

  state.currentTurn = chooseStartingPlayer();
}

function chooseStartingPlayer() {
  let bestPlayer = 0;
  let bestValue = -1;

  state.players.forEach((player, index) => {
    const doubles = player.hand
      .filter(tile => tile.a === tile.b)
      .sort((a, b) => b.a - a.a);

    if (doubles.length) {
      const value = 100 + doubles[0].a;

      if (value > bestValue) {
        bestValue = value;
        bestPlayer = index;
      }

      return;
    }

    const highest = Math.max(
      ...player.hand.map(tilePoints)
    );

    if (bestValue < 100 && highest > bestValue) {
      bestValue = highest;
      bestPlayer = index;
    }
  });

  return bestPlayer;
}

/* =========================================
   BOARD AND LEGAL MOVES
========================================= */

function getEnds() {
  if (!state.board.length) return null;

  return {
    left: state.board[0].left,
    right: state.board[state.board.length - 1].right
  };
}

function getLegalMoves(playerIndex) {
  const player = state.players[playerIndex];

  if (!player) return [];

  if (!state.board.length) {
    return player.hand.map(tile => ({
      tile,
      side: "right",
      flip: false
    }));
  }

  const ends = getEnds();
  const moves = [];

  for (const tile of player.hand) {
    if (tile.a === ends.left) {
      moves.push({
        tile,
        side: "left",
        flip: true
      });
    }

    if (tile.b === ends.left) {
      moves.push({
        tile,
        side: "left",
        flip: false
      });
    }

    if (tile.b === ends.right) {
      moves.push({
        tile,
        side: "right",
        flip: true
      });
    }

    if (tile.a === ends.right) {
      moves.push({
        tile,
        side: "right",
        flip: false
      });
    }
  }

  const unique = new Map();

  moves.forEach(move => {
    unique.set(
      `${move.tile.id}-${move.side}`,
      move
    );
  });

  return [...unique.values()];
}

function addBoardTile(tile, side, flip) {
  let left = tile.a;
  let right = tile.b;

  if (flip) {
    [left, right] = [right, left];
  }

  if (!state.board.length) {
    state.board.push({
      tileId: tile.id,
      left,
      right
    });

    return;
  }

  if (side === "left") {
    if (right !== getEnds().left) {
      [left, right] = [right, left];
    }

    state.board.unshift({
      tileId: tile.id,
      left,
      right
    });

  } else {
    if (left !== getEnds().right) {
      [left, right] = [right, left];
    }

    state.board.push({
      tileId: tile.id,
      left,
      right
    });
  }
}

function removeTileFromHand(playerIndex, tileId) {
  const hand = state.players[playerIndex].hand;

  const index = hand.findIndex(
    tile => tile.id === tileId
  );

  if (index === -1) return null;

  return hand.splice(index, 1)[0];
}

function calculateHandPoints(player) {
  return player.hand.reduce(
    (sum, tile) => sum + tilePoints(tile),
    0
  );
}

function getFivesScore() {
  if (state.variant !== "fives" || !state.board.length) {
    return 0;
  }

  const ends = getEnds();
  const total = ends.left + ends.right;

  return total > 0 && total % 5 === 0
    ? total
    : 0;
}

/* =========================================
   TURN MANAGEMENT
========================================= */

function getNextPlayer(index) {
  return (index + 1) % state.playersCount;
}

function advanceTurn() {
  if (state.finished) return;

  state.currentTurn = getNextPlayer(state.currentTurn);
  state.selectedTile = null;

  renderAll();

  const player = state.players[state.currentTurn];

  setStatus(
    `الدور الآن: ${player.name}`,
    `لديه ${player.hand.length} قطعة`
  );

  if (
    state.playType === "ai" &&
    !player.isHuman
  ) {
    scheduleAI();
  }
}

function playTile(playerIndex, tileId, side) {
  if (
    !state.started ||
    state.finished ||
    state.busy ||
    playerIndex !== state.currentTurn
  ) {
    return false;
  }

  const player = state.players[playerIndex];

  const move = getLegalMoves(playerIndex).find(
    item =>
      item.tile.id === tileId &&
      item.side === side
  );

  if (!move) {
    toast("هذه القطعة لا تناسب طرف السلسلة.");
    return false;
  }

  const tile = removeTileFromHand(playerIndex, tileId);

  if (!tile) return false;

  addBoardTile(tile, side, move.flip);

  state.selectedTile = null;
  state.roundPasses = 0;

  const earned = getFivesScore();

  if (earned > 0) {
    player.score += earned;

    setStatus(
      `${player.name} سجل ${earned} نقطة.`,
      "تم احتساب مجموع الطرفين المفتوحين."
    );
  } else {
    setStatus(
      `${player.name} لعب ${tile.a} - ${tile.b}.`,
      "تم وضع القطعة على الطاولة."
    );
  }

  renderAll();

  if (checkEnd()) return true;

  advanceTurn();

  return true;
}

/* =========================================
   DRAWING AND PASSING
========================================= */

function drawTile() {
  if (
    state.finished ||
    state.busy ||
    !state.started
  ) return;

  const player = state.players[state.currentTurn];

  if (!player.isHuman) return;

  if (state.variant === "block") {
    toast("نظام الحجب لا يسمح بالسحب.");
    return;
  }

  if (state.playersCount !== 2) {
    toast("لا توجد كومة سحب في هذا التوزيع.");
    return;
  }

  if (getLegalMoves(state.currentTurn).length) {
    toast("لديك حركة قانونية. العب قطعة أولًا.");
    return;
  }

  if (!state.boneyard.length) {
    toast("انتهت كومة السحب. يمكنك تمرير الدور.");
    return;
  }

  const tile = state.boneyard.pop();

  player.hand.push(tile);

  renderAll();

  if (getLegalMoves(state.currentTurn).length) {
    setStatus(
      "تم سحب قطعة جديدة.",
      "اختر القطعة المناسبة للعب."
    );
  } else if (state.boneyard.length) {
    setStatus(
      "القطعة لا تناسب الأطراف.",
      "يمكنك سحب قطعة أخرى."
    );
  } else {
    setStatus(
      "انتهت كومة السحب.",
      "يمكنك تمرير الدور."
    );
  }
}

function passTurn() {
  if (
    state.finished ||
    state.busy ||
    !state.started
  ) return;

  const player = state.players[state.currentTurn];

  if (!player.isHuman) return;

  if (getLegalMoves(state.currentTurn).length) {
    toast("لديك حركة قانونية ولا يمكنك تخطي الدور.");
    return;
  }

  if (
    state.variant !== "block" &&
    state.playersCount === 2 &&
    state.boneyard.length
  ) {
    toast("يجب سحب قطعة أولًا.");
    return;
  }

  registerPass();
}

function registerPass() {
  const player = state.players[state.currentTurn];

  state.roundPasses++;

  setStatus(
    `${player.name} مرر الدور.`,
    `مرور ${state.roundPasses} من ${state.playersCount}`
  );

  if (state.roundPasses >= state.playersCount) {
    const result = {
      reason: "blocked",
      winner: null
    };

    const totals = state.players.map(
      calculateHandPoints
    );

    const minimum = Math.min(...totals);

    const winners = totals
      .map((value, index) =>
        value === minimum ? index : -1
      )
      .filter(index => index !== -1);

    result.winners = winners;

    if (winners.length === 1) {
      result.winner = winners[0];
    }

    finishRound(result);
    return;
  }

  advanceTurn();
}

/* =========================================
   ROUND RESULTS
========================================= */

function calculateRoundWinner() {
  const emptyIndex = state.players.findIndex(
    player => player.hand.length === 0
  );

  if (emptyIndex !== -1) {
    return {
      winner: emptyIndex,
      reason: "empty"
    };
  }

  return null;
}

function checkEnd() {
  const result = calculateRoundWinner();

  if (!result) return false;

  finishRound(result);
  return true;
}

function finishRound(result) {
  if (state.finished) return;

  state.finished = true;
  state.busy = false;

  const points = state.players.map(
    calculateHandPoints
  );

  let message = "";

  if (
    result.winner !== null &&
    result.winner !== undefined
  ) {
    const winner = state.players[result.winner];

    const earned = points.reduce(
      (sum, value, index) =>
        index === result.winner ? sum : sum + value,
      0
    );

    winner.score += earned;

    message =
      `${winner.name} فاز بالجولة! ` +
      `حصل على ${earned} نقطة.`;

  } else {
    const winners = result.winners || [];

    message =
      "انتهت الجولة بالتعادل بين: " +
      winners.map(index =>
        state.players[index].name
      ).join(" و ");
  }

  renderAll();
  renderControls();

  setStatus(
    message,
    "يمكنك بدء جولة جديدة أو إنهاء المباراة."
  );

  const champion = state.players.find(
    player => player.score >= state.targetScore
  );

  if (champion) {
    setStatus(
      `انتهت المباراة! الفائز هو ${champion.name}.`,
      `مجموع نقاطه ${champion.score}`
    );

    toast(`الفائز بالمباراة: ${champion.name}`);
    addNextRoundButton("العودة للإعدادات");

  } else {
    addNextRoundButton("ابدأ الجولة التالية");
  }
}

function addNextRoundButton(label) {
  const status = $("gameStatus");

  if (!status) return;

  const oldButton = $("nextRoundButton");

  if (oldButton) oldButton.remove();

  const button = document.createElement("button");

  button.id = "nextRoundButton";
  button.className = "primary-btn";
  button.textContent = label;
  button.style.marginTop = "12px";

  button.addEventListener("click", () => {
    if (state.players.some(
      player => player.score >= state.targetScore
    )) {
      returnToSetup();
    } else {
      startNextRound();
    }
  });

  status.parentElement.appendChild(button);
}

function startNextRound() {
  state.round++;

  createPlayers();

  dealRound();

  state.started = true;

  const button = $("nextRoundButton");
  if (button) button.remove();

  setStatus(
    "بدأت الجولة الجديدة.",
    `الجولة رقم ${state.round}`
  );

  renderAll();

  if (
    state.playType === "ai" &&
    !state.players[state.currentTurn].isHuman
  ) {
    scheduleAI();
  }
}

/* =========================================
   AI ENGINE
========================================= */

function evaluateMove(move, playerIndex) {
  const tile = move.tile;

  let score = tilePoints(tile) * 1.2;

  if (tile.a === tile.b) {
    score += 5;
  }

  const player = state.players[playerIndex];

  const remaining = player.hand.filter(
    item => item.id !== tile.id
  );

  const matching = remaining.filter(
    item =>
      item.a === tile.a ||
      item.b === tile.a ||
      item.a === tile.b ||
      item.b === tile.b
  ).length;

  score += matching * 1.7;

  if (state.variant === "fives") {
    const ends = getEnds();

    let left = ends ? ends.left : tile.a;
    let right = ends ? ends.right : tile.b;

    if (move.side === "left") {
      left = move.flip ? tile.a : tile.b;
    } else {
      right = move.flip ? tile.b : tile.a;
    }

    const total = left + right;

    if (total % 5 === 0) {
      score += 15;
    }
  }

  return score;
}

function chooseAIMove(playerIndex) {
  const moves = getLegalMoves(playerIndex);

  if (!moves.length) return null;

  const ranked = moves
    .map(move => ({
      move,
      score: evaluateMove(move, playerIndex)
    }))
    .sort((a, b) => b.score - a.score);

  if (state.aiLevel === "easy") {
    return moves[
      Math.floor(Math.random() * moves.length)
    ];
  }

  if (state.aiLevel === "medium") {
    const candidates = ranked.slice(
      0,
      Math.min(3, ranked.length)
    );

    return candidates[
      Math.floor(Math.random() * candidates.length)
    ].move;
  }

  if (state.aiLevel === "hard") {
    return ranked[0].move;
  }

  // Expert: prefer moves that reduce future options
  // available to opponents, while keeping useful tiles.
  const opponentIndex = getNextPlayer(playerIndex);

  return ranked
    .map(item => {
      const move = item.move;
      let extra = 0;

      const ends = getEnds();

      if (ends) {
        const exposed = move.side === "left"
          ? (move.flip ? move.tile.a : move.tile.b)
          : (move.flip ? move.tile.b : move.tile.a);

        const opponent = state.players[opponentIndex];

        const opponentCanMatch = opponent.hand.filter(
          tile =>
            tile.a === exposed ||
            tile.b === exposed
        ).length;

        extra -= opponentCanMatch * 2;
      }

      return {
        move,
        score: item.score + extra
      };
    })
    .sort((a, b) => b.score - a.score)[0].move;
}

async function scheduleAI() {
  if (
    state.finished ||
    state.busy ||
    state.playType !== "ai"
  ) return;

  const player = state.players[state.currentTurn];

  if (!player || player.isHuman) return;

  state.busy = true;
  renderAll();

  const waitTime = {
    easy: 550,
    medium: 800,
    hard: 1050,
    expert: 1300
  }[state.aiLevel] || 800;

  await delay(waitTime);

  if (state.finished) {
    state.busy = false;
    return;
  }

  const moves = getLegalMoves(state.currentTurn);

  if (moves.length) {
    const chosen = chooseAIMove(state.currentTurn);

    state.busy = false;

    if (chosen) {
      playTile(
        state.currentTurn,
        chosen.tile.id,
        chosen.side
      );
    }

    return;
  }

  if (
    state.variant !== "block" &&
    state.playersCount === 2 &&
    state.boneyard.length
  ) {
    const tile = state.boneyard.pop();

    player.hand.push(tile);

    state.busy = false;
    renderAll();

    if (getLegalMoves(state.currentTurn).length) {
      scheduleAI();
    } else if (state.boneyard.length) {
      scheduleAI();
    } else {
      registerPass();
    }

    return;
  }

  state.busy = false;
  registerPass();
}

/* =========================================
   RENDER PLAYERS
========================================= */

function renderSeat(index, position) {
  const element = $(position);

  if (!element) return;

  if (
    index === null ||
    index === undefined ||
    index >= state.players.length
  ) {
    element.classList.add("hidden");
    return;
  }

  const player = state.players[index];
  const active = index === state.currentTurn;

  element.classList.remove("hidden");
  element.classList.toggle("current", active);
  element.classList.remove("inactive");

  const avatar = element.querySelector(".player-avatar");
  const name = element.querySelector("strong");
  const details = element.querySelector("small");

  if (avatar) {
    avatar.textContent =
      player.name === "أنت"
        ? "أ"
        : player.name.slice(0, 1);
  }

  if (name) {
    name.textContent = player.name;
  }

  if (details) {
    details.textContent =
      `${player.hand.length} قطعة • ${player.score} نقطة`;
  }
}

function renderSeats() {
  renderSeat(0, "seatBottom");

  if (state.playersCount === 2) {
    renderSeat(1, "seatTop");
    renderSeat(null, "seatLeft");
    renderSeat(null, "seatRight");

  } else if (state.playersCount === 3) {
    renderSeat(1, "seatTop");
    renderSeat(2, "seatLeft");
    renderSeat(null, "seatRight");

  } else {
    renderSeat(2, "seatTop");
    renderSeat(3, "seatLeft");
    renderSeat(1, "seatRight");
  }
}

/* =========================================
   RENDER BOARD
========================================= */

function renderBoard() {
  const board = $("dominoBoard");

  if (!board) return;

  if (!state.board.length) {
    board.innerHTML = `
      <div class="board-placeholder">
        <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5">
          <rect x="4" y="3" width="16" height="18" rx="3"/>
          <path d="M12 3v18"/>
        </svg>
        ابدأ بوضع أول قطعة على الطاولة
      </div>
    `;

    return;
  }

  board.innerHTML = state.board.map(tile => `
    <div class="domino-tile">
      ${makeHalf(tile.left)}
      ${makeHalf(tile.right)}
    </div>
  `).join("");
}

/* =========================================
   RENDER HAND
========================================= */

function renderHand() {
  const hand = $("playerHand");

  if (!hand) return;

  const player = state.players[state.currentTurn];

  if (!player) {
    hand.innerHTML = "";
    return;
  }

  const count = $("handCount");

  if (count) {
    count.textContent = `${player.hand.length} قطعة`;
  }

  if (!player.isHuman) {
    hand.innerHTML = `
      <div class="hand-empty">
        الكمبيوتر يفكر في حركته...
      </div>
    `;

    return;
  }

  if (state.playType === "local") {
    hand.innerHTML = `
      <div class="hand-empty">
        دور ${escapeHTML(player.name)}
      </div>
    `;
  }

  hand.innerHTML = player.hand.map(tile => `
    <button
      class="hand-tile ${
        state.selectedTile === tile.id ? "selected" : ""
      }"
      data-tile-id="${escapeHTML(tile.id)}"
      type="button"
      ${state.finished || state.busy ? "disabled" : ""}
      aria-label="قطعة ${tile.a} و ${tile.b}"
    >
      ${makePips(tile.a)}
      ${makePips(tile.b)}
    </button>
  `).join("");

  hand.querySelectorAll("[data-tile-id]").forEach(button => {
    button.addEventListener("click", () => {
      if (state.busy || state.finished) return;

      state.selectedTile = button.dataset.tileId;

      renderHand();
      renderControls();
    });
  });
}

/* =========================================
   RENDER CONTROLS
========================================= */

function renderControls() {
  const player = state.players[state.currentTurn];

  if (!player) return;

  const humanTurn = player.isHuman;

  const legalMoves = getLegalMoves(state.currentTurn);

  const selectedMoves = legalMoves.filter(
    move => move.tile.id === state.selectedTile
  );

  const leftButton = $("playLeftButton");
  const rightButton = $("playRightButton");
  const drawButton = $("drawTileButton");
  const passButton = $("passTurnButton");

  const disabled =
    state.finished ||
    state.busy ||
    !humanTurn;

  if (leftButton) {
    leftButton.disabled =
      disabled ||
      !selectedMoves.some(move => move.side === "left");
  }

  if (rightButton) {
    rightButton.disabled =
      disabled ||
      !selectedMoves.some(move => move.side === "right");
  }

  const canDraw =
    state.variant !== "block" &&
    state.playersCount === 2 &&
    state.boneyard.length > 0 &&
    legalMoves.length === 0;

  if (drawButton) {
    drawButton.disabled = disabled || !canDraw;
  }

  const canPass =
    legalMoves.length === 0 &&
    (
      state.variant === "block" ||
      state.playersCount !== 2 ||
      state.boneyard.length === 0
    );

  if (passButton) {
    passButton.disabled = disabled || !canPass;
  }

  const info = $("gameInfo");

  if (info) {
    info.textContent =
      `الجولة ${state.round} • السحب ${state.boneyard.length}`;
  }
}

/* =========================================
   RENDER EVERYTHING
========================================= */

function renderAll() {
  renderSeats();
  renderBoard();
  renderHand();
  renderControls();

  if ($("gameModeLabel")) {
    const labels = {
      draw: "دومينو السحب",
      block: "دومينو الحجب",
      fives: "دومينو الخمسات"
    };

    $("gameModeLabel").textContent =
      `${state.playersCount} لاعبين · ${labels[state.variant]}`;
  }
}

/* =========================================
   START AND EXIT
========================================= */

function startGame() {
  if (state.playType === "online") {
    toast(
      "اللعب الأونلاين لم يُربط بعد. اختر اللعب المحلي أو الكمبيوتر."
    );
    return;
  }

  state.variant =
    document.querySelector(
      "#variantOptions .active"
    )?.dataset.value || "draw";

  state.playersCount = Number(
    document.querySelector(
      "#playerOptions .active"
    )?.dataset.value || 2
  );

  state.playType =
    document.querySelector(
      "#playTypeOptions .active"
    )?.dataset.value || "ai";

  if (state.playType === "online") {
    toast("نظام المباريات الأونلاين قيد الربط.");
    return;
  }

  state.aiLevel = $("aiLevel")?.value || "medium";

  const selectedScore = Number(
    $("targetScore")?.value || 200
  );

  const customScore = Number(
    $("customScore")?.value || 0
  );

  state.targetScore =
    customScore >= 50 && customScore <= 1000
      ? customScore
      : selectedScore;

  state.round = 1;
  state.scores = Array(state.playersCount).fill(0);

  createPlayers();
  dealRound();

  state.started = true;
  state.finished = false;

  const setup = $("setupScreen");
  const game = $("gameScreen");

  if (setup) setup.style.display = "none";
  if (game) game.style.display = "block";

  const oldButton = $("nextRoundButton");
  if (oldButton) oldButton.remove();

  setStatus(
    `بدأت المباراة. الدور الأول: ${state.players[state.currentTurn].name}`,
    getDistributionDescription()
  );

  renderAll();

  if (
    state.playType === "ai" &&
    !state.players[state.currentTurn].isHuman
  ) {
    scheduleAI();
  }
}

function returnToSetup() {
  state.started = false;
  state.finished = false;
  state.busy = false;

  const setup = $("setupScreen");
  const game = $("gameScreen");

  if (setup) setup.style.display = "block";
  if (game) game.style.display = "none";

  const button = $("nextRoundButton");
  if (button) button.remove();

  updateDealDescription();
}

/* =========================================
   OPTION SELECTION
========================================= */

function setupOptionGroup(containerId, callback) {
  const container = $(containerId);

  if (!container) return;

  container.querySelectorAll("[data-value]").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll("[data-value]").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      if (callback) {
        callback(button.dataset.value);
      }
    });
  });
}

function updateAISettings(value) {
  const settings = $("aiSettings");

  if (!settings) return;

  settings.style.display =
    value === "ai" ? "block" : "none";
}

function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("open");
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("open");
}

/* =========================================
   SUPABASE CONNECTION CHECK
========================================= */

async function checkSignedInUser() {
  try {
    const {
      data,
      error
    } = await supabase.auth.getUser();

    if (error) throw error;

    return data.user || null;

  } catch (error) {
    console.warn(
      "Domino: user session not available",
      error.message
    );

    return null;
  }
}

/*
  Online integration is intentionally not activated here.

  Existing database functions need a verified match ID,
  confirmed participant state, and exact RPC response
  contracts before they can safely initialize an online
  game or publish realtime updates.

  No client-side wallet, score rewards, or coin changes
  are performed by this file.
*/

/* =========================================
   EVENTS
========================================= */

function bindEvents() {
  setupOptionGroup(
    "variantOptions",
    () => updateDealDescription()
  );

  setupOptionGroup(
    "playerOptions",
    () => updateDealDescription()
  );

  setupOptionGroup(
    "playTypeOptions",
    value => updateAISettings(value)
  );

  $("startGameButton")?.addEventListener(
    "click",
    startGame
  );

  $("playLeftButton")?.addEventListener(
    "click",
    () => {
      if (!state.selectedTile) {
        toast("اختر قطعة أولًا.");
        return;
      }

      playTile(
        state.currentTurn,
        state.selectedTile,
        "left"
      );
    }
  );

  $("playRightButton")?.addEventListener(
    "click",
    () => {
      if (!state.selectedTile) {
        toast("اختر قطعة أولًا.");
        return;
      }

      playTile(
        state.currentTurn,
        state.selectedTile,
        "right"
      );
    }
  );

  $("drawTileButton")?.addEventListener(
    "click",
    drawTile
  );

  $("passTurnButton")?.addEventListener(
    "click",
    passTurn
  );

  $("leaveGameButton")?.addEventListener(
    "click",
    () => {
      if (confirm("هل تريد مغادرة الطاولة الحالية؟")) {
        returnToSetup();
      }
    }
  );

  $("rulesButton")?.addEventListener(
    "click",
    () => openModal("rulesModal")
  );

  $("gameRulesButton")?.addEventListener(
    "click",
    () => openModal("rulesModal")
  );

  $("closeRulesButton")?.addEventListener(
    "click",
    () => closeModal("rulesModal")
  );

  $("closeRulesConfirm")?.addEventListener(
    "click",
    () => closeModal("rulesModal")
  );

  $("closeRoomButton")?.addEventListener(
    "click",
    () => closeModal("roomModal")
  );

  $("cancelRoomButton")?.addEventListener(
    "click",
    () => closeModal("roomModal")
  );

  $("gameMenuButton")?.addEventListener(
    "click",
    () => openModal("rulesModal")
  );

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        modal.classList.remove("open");
      }
    });
  });

  [
    "createRoomButton",
    "joinRoomButton",
    "quickMatchButton",
    "inviteFriendButton"
  ].forEach(id => {
    $(id)?.addEventListener("click", () => {
      toast("نظام الغرف والبحث عن اللاعبين لم يُربط بعد.");
    });
  });
}

/* =========================================
   INITIALIZATION
========================================= */

async function initializeDomino() {
  bindEvents();
  updateDealDescription();

  updateAISettings(
    document.querySelector(
      "#playTypeOptions .active"
    )?.dataset.value || "ai"
  );

  await checkSignedInUser();

  console.info("HANOON DOMINO ENGINE READY");
}

initializeDomino();
