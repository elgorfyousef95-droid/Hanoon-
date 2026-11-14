
const $ = (id) => document.getElementById(id);

const state = {
  variant: "draw",
  playersCount: 2,
  playType: "ai",
  aiLevel: "medium",
  targetScore: 200,
  players: [],
  board: [],
  boneyard: [],
  currentTurn: 0,
  selectedTile: null,
  started: false,
  finished: false,
  scores: [],
  round: 1,
  direction: 1,
  busy: false,
  roundStarter: 0
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

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
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

function tileHTML(a, b, vertical = false) {
  return `
    <div class="${vertical ? "hand-tile" : "domino-tile"}">
      ${makePips(a)}
      ${makePips(b)}
    </div>
  `;
}

function makeDeck() {
  const deck = [];
  let id = 0;

  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      deck.push({
        id: `tile-${++id}`,
        a,
        b
      });
    }
  }

  return deck;
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function tilePoints(tile) {
  return tile.a + tile.b;
}

function getPlayerNames() {
  if (state.playType === "local") {
    return ["اللاعب الأول", "اللاعب الثاني", "اللاعب الثالث", "اللاعب الرابع"];
  }

  return ["أنت", "الكمبيوتر 1", "الكمبيوتر 2", "الكمبيوتر 3"];
}

function createPlayers() {
  const names = getPlayerNames();

  state.players = Array.from({ length: state.playersCount }, (_, index) => ({
    id: index,
    name: names[index],
    hand: [],
    score: state.scores[index] || 0,
    isHuman: state.playType === "local" || index === 0
  }));

  if (state.playType === "ai") {
    state.players[0].name = "أنت";
  }
}

function getDealSize() {
  if (state.playersCount === 3) return 9;
  return 7;
}

function getDistributionDescription() {
  if (state.playersCount === 2) {
    return "كل لاعب يأخذ 7 قطع، ويتبقى 14 قطعة في كومة السحب.";
  }

  if (state.playersCount === 3) {
    return "كل لاعب يأخذ 9 قطع، والقطعة المتبقية خارج اللعب ولا تدخل في الحساب.";
  }

  return "كل لاعب يأخذ 7 قطع، ولا توجد كومة سحب.";
}

function updateDealDescription() {
  const description = $("dealDescription");
  if (description) description.textContent = getDistributionDescription();
}

function chooseStartingPlayer() {
  let bestPlayer = 0;
  let bestValue = -1;

  state.players.forEach((player, index) => {
    const doubles = player.hand
      .filter(tile => tile.a === tile.b)
      .sort((x, y) => y.a - x.a);

    if (doubles.length) {
      const value = 100 + doubles[0].a;

      if (value > bestValue) {
        bestValue = value;
        bestPlayer = index;
      }
    } else {
      const highest = Math.max(...player.hand.map(tile => tilePoints(tile)));
      if (bestValue < 100 && highest > bestValue) {
        bestValue = highest;
        bestPlayer = index;
      }
    }
  });

  return bestPlayer;
}

function dealRound() {
  const deck = shuffle(makeDeck());
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

  /*
    التوزيع المتفق عليه:
    2 لاعبين: 7 لكل لاعب، والباقي للسحب.
    3 لاعبين: 9 لكل لاعب، وتبقى قطعة واحدة خارج اللعب.
    4 لاعبين: 7 لكل لاعب، ولا توجد كومة سحب.
  */

  if (state.playersCount === 2) {
    state.boneyard = deck.slice(cursor);
  } else if (state.playersCount === 3) {
    state.boneyard = [];
    state.excludedTile = deck[cursor] || null;
  } else {
    state.boneyard = [];
    state.excludedTile = null;
  }

  state.board = [];
  state.currentTurn = chooseStartingPlayer();
  state.roundStarter = state.currentTurn;
  state.selectedTile = null;
  state.direction = 1;
  state.finished = false;
  state.busy = false;
}

function getNextPlayer(index) {
  return (index + state.direction + state.playersCount) % state.playersCount;
}

function getEnds() {
  if (!state.board.length) return null;

  return {
    left: state.board[0].left,
    right: state.board[state.board.length - 1].right
  };
}

function getLegalMoves(playerIndex) {
  const player = state.players[playerIndex];

  if (!player || !player.hand.length) return [];

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

    if (tile.a === ends.right) {
      moves.push({
        tile,
        side: "right",
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
  }

  const unique = new Map();

  moves.forEach(move => {
    unique.set(`${move.tile.id}-${move.side}`, move);
  });

  return [...unique.values()];
}

function getOpenEndsTotal() {
  if (!state.board.length) return 0;

  const ends = getEnds();
  return ends.left + ends.right;
}

function getFivesScore() {
  if (state.variant !== "fives" || !state.board.length) return 0;

  const total = getOpenEndsTotal();

  return total % 5 === 0 ? total : 0;
}

function addBoardTile(tile, side, flip) {
  let left = tile.a;
  let right = tile.b;

  if (flip) {
    [left, right] = [right, left];
  }

  if (state.board.length === 0) {
    state.board.push({
      tileId: tile.id,
      left,
      right,
      double: left === right
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
      right,
      double: left === right
    });
  } else {
    if (left !== getEnds().right) {
      [left, right] = [right, left];
    }

    state.board.push({
      tileId: tile.id,
      left,
      right,
      double: left === right
    });
  }
}

function removeTileFromHand(playerIndex, tileId) {
  const player = state.players[playerIndex];
  const index = player.hand.findIndex(tile => tile.id === tileId);

  if (index < 0) return null;

  return player.hand.splice(index, 1)[0];
}

function calculateHandPoints(player) {
  return player.hand.reduce((sum, tile) => sum + tilePoints(tile), 0);
}

function calculateRoundWinner() {
  const emptyPlayer = state.players.find(player => player.hand.length === 0);

  if (emptyPlayer) {
    return {
      winner: emptyPlayer.id,
      reason: "empty"
    };
  }

  if (state.players.every(player => player.hand.length > 0)) {
    const allBlocked = state.players.every(player => getLegalMoves(player.id).length === 0);

    if (allBlocked && state.boneyard.length === 0) {
      const points = state.players.map(player => calculateHandPoints(player));
      const minimum = Math.min(...points);
      const winners = points
        .map((value, index) => value === minimum ? index : -1)
        .filter(index => index !== -1);

      return {
        winner: winners.length === 1 ? winners[0] : null,
        winners,
        reason: "blocked"
      };
    }
  }

  return null;
}

function finishRound(result) {
  if (state.finished) return;

  state.finished = true;

  const points = state.players.map(player => calculateHandPoints(player));
  let message = "";

  if (result.winner !== null && result.winner !== undefined) {
    const winner = state.players[result.winner];

    if (result.reason === "empty") {
      const earned = points.reduce((sum, value, index) =>
        index === result.winner ? sum : sum + value, 0);

      winner.score += earned;
      message = `${winner.name} فاز بالجولة! حصل على ${earned} نقطة.`;
    } else {
      const earned = points.reduce((sum, value, index) =>
        index === result.winner ? sum : sum + value, 0);

      winner.score += earned;
      message = `${winner.name} فاز بعد توقف اللعب. نقاط الجولة: ${earned}.`;
    }
  } else {
    const winners = result.winners || [];
    message = "انتهت الجولة بالتعادل بين: " +
      winners.map(index => state.players[index].name).join(" و ");
  }

  renderAll();
  setStatus(message);

  const champion = state.players.find(player => player.score >= state.targetScore);

  if (champion) {
    setTimeout(() => {
      alert(`انتهت المباراة! الفائز هو ${champion.name} برصيد ${champion.score} نقطة.`);
      state.scores = state.players.map(player => player.score);
      returnToSetup();
    }, 350);
    return;
  }

  const nextButton = document.createElement("button");
  nextButton.className = "primary-btn";
  nextButton.textContent = "ابدأ الجولة التالية";
  nextButton.style.marginTop = "12px";
  nextButton.addEventListener("click", startNextRound);

  $("gameStatus").appendChild(document.createElement("br"));
  $("gameStatus").appendChild(nextButton);
}

function checkEnd() {
  const result = calculateRoundWinner();

  if (result) {
    finishRound(result);
    return true;
  }

  return false;
}

function playTile(playerIndex, tileId, side) {
  if (!state.started || state.finished || state.busy) return false;
  if (playerIndex !== state.currentTurn) return false;

  const player = state.players[playerIndex];
  const tile = player.hand.find(item => item.id === tileId);

  if (!tile) return false;

  const move = getLegalMoves(playerIndex).find(item =>
    item.tile.id === tileId && item.side === side
  );

  if (!move) {
    toast("هذه القطعة لا تناسب طرف السلسلة.");
    return false;
  }

  const removed = removeTileFromHand(playerIndex, tileId);

  addBoardTile(removed, side, move.flip);

  state.selectedTile = null;

  const earned = getFivesScore();

  if (earned > 0) {
    player.score += earned;
    setStatus(`${player.name} سجل ${earned} نقطة من نظام الخمسات.`);
  } else {
    setStatus(`${player.name} لعب قطعة ${removed.a} - ${removed.b}.`);
  }

  renderAll();

  if (checkEnd()) return true;

  advanceTurn();
  return true;
}

function advanceTurn() {
  state.currentTurn = getNextPlayer(state.currentTurn);
  state.selectedTile = null;

  renderAll();

  if (state.playType === "ai" && state.currentTurn !== 0) {
    scheduleAI();
  } else {
    setStatus(`الدور الآن: ${state.players[state.currentTurn].name}`);
  }
}

function drawTile() {
  if (state.finished || state.busy) return;

  const player = state.players[state.currentTurn];

  if (state.playType === "ai" && state.currentTurn !== 0) return;

  if (state.playersCount !== 2) {
    toast("لا توجد كومة سحب في هذا التوزيع.");
    return;
  }

  if (state.variant === "block") {
    toast("نظام البلوك لا يحتوي على سحب.");
    return;
  }

  if (state.boneyard.length === 0) {
    toast("كومة السحب فارغة.");
    return;
  }

  if (getLegalMoves(state.currentTurn).length > 0) {
    toast("لديك قطعة يمكنك لعبها، لا يمكنك السحب الآن.");
    return;
  }

  const tile = state.boneyard.pop();
  player.hand.push(tile);

  renderAll();

  if (getLegalMoves(state.currentTurn).length > 0) {
    setStatus("تم سحب قطعة. اختر القطعة المناسبة للعب.");
  } else if (state.boneyard.length > 0) {
    setStatus("القطعة المسحوبة لا تناسب. يمكنك السحب مرة أخرى.");
  } else {
    setStatus("انتهت كومة السحب. يمكنك تمرير الدور.");
  }
}

function passTurn() {
  if (state.finished || state.busy) return;

  if (state.playType === "ai" && state.currentTurn !== 0) return;

  if (getLegalMoves(state.currentTurn).length > 0) {
    toast("لديك حركة قانونية. لا يمكنك تمرير الدور.");
    return;
  }

  if (state.variant !== "block" && state.boneyard.length > 0) {
    toast("يجب سحب قطعة أولاً.");
    return;
  }

  const playerName = state.players[state.currentTurn].name;
  setStatus(`${playerName} مرر الدور.`);

  if (checkEnd()) return;

  advanceTurn();
}

function chooseAIMove(playerIndex) {
  const moves = getLegalMoves(playerIndex);
  if (!moves.length) return null;

  const level = state.aiLevel;

  const ranked = moves.map(move => {
    const tile = move.tile;
    let score = tilePoints(tile);

    if (tile.a === tile.b) score += 5;

    if (state.variant === "fives") {
      const ends = getEnds();

      let nextLeft = ends ? ends.left : tile.a;
      let nextRight = ends ? ends.right : tile.b;

      if (move.side === "left") {
        nextLeft = move.flip ? tile.a : tile.b;
      } else {
        nextRight = move.flip ? tile.b : tile.a;
      }

      const total = nextLeft + nextRight;

      if (total % 5 === 0) score += 15;
    }

    return { move, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  if (level === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (level === "medium") {
    const top = ranked.slice(0, Math.min(3, ranked.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  return ranked[0].move;
}

function scheduleAI() {
  if (state.finished || state.playType !== "ai") return;

  state.busy = true;
  renderControls();

  setTimeout(() => {
    state.busy = false;

    if (state.finished || state.currentTurn === 0) return;

    const player = state.players[state.currentTurn];
    const moves = getLegalMoves(state.currentTurn);

    if (moves.length) {
      const chosen = chooseAIMove(state.currentTurn);

      if (chosen) {
        playTile(state.currentTurn, chosen.tile.id, chosen.side);
      }

      return;
    }

    if (
      state.variant !== "block" &&
      state.playersCount === 2 &&
      state.boneyard.length > 0
    ) {
      const tile = state.boneyard.pop();
      player.hand.push(tile);

      renderAll();

      if (getLegalMoves(state.currentTurn).length > 0) {
        scheduleAI();
      } else if (state.boneyard.length > 0) {
        scheduleAI();
      } else {
        advanceTurn();
      }

      return;
    }

    advanceTurn();
  }, state.aiLevel === "easy" ? 650 : 950);
}

function renderSeat(index, position) {
  const element = $(position);
  if (!element) return;

  if (index === null || index === undefined || index >= state.players.length) {
    element.classList.add("hidden");
    return;
  }

  const player = state.players[index];
  const active = index === state.currentTurn;

  element.classList.remove("hidden");
  element.classList.toggle("current", active);

  const avatar = element.querySelector(".player-avatar");
  const name = element.querySelector("strong");
  const details = element.querySelector("small");

  avatar.textContent = player.name === "أنت" ? "أ" : player.name.slice(0, 1);
  name.innerHTML = `${active ? '<span class="turn-dot"></span>' : ""}${escapeHTML(player.name)}`;
  details.textContent = `${player.hand.length} قطعة • ${player.score} نقطة`;
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

function renderBoard() {
  const board = $("dominoBoard");

  if (!state.board.length) {
    board.innerHTML = `
      <div class="board-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="4" y="3" width="16" height="18" rx="3"/>
          <path d="M4 12h16"/>
        </svg>
        ابدأ بوضع أول قطعة على الطاولة
      </div>
    `;
    return;
  }

  board.innerHTML = state.board.map(tile => `
    <div class="domino-tile">
      ${makePips(tile.left)}
      ${makePips(tile.right)}
    </div>
  `).join("");
}

function renderHand() {
  const hand = $("playerHand");
  const player = state.players[state.currentTurn];

  if (!player) {
    hand.innerHTML = "";
    return;
  }

  $("handCount").textContent = `${player.hand.length} قطعة`;

  if (state.playType === "ai" && state.currentTurn !== 0) {
    hand.innerHTML = `
      <div class="setting-note">الكمبيوتر يفكر في حركته...</div>
    `;
    return;
  }

  hand.innerHTML = player.hand.map(tile => `
    <button
      class="hand-tile ${state.selectedTile === tile.id ? "selected" : ""}"
      data-tile-id="${escapeHTML(tile.id)}"
      ${state.busy || state.finished ? "disabled" : ""}
      aria-label="قطعة ${tile.a} و ${tile.b}"
    >
      ${makePips(tile.a)}
      ${makePips(tile.b)}
    </button>
  `).join("");

  hand.querySelectorAll("[data-tile-id]").forEach(button => {
    button.addEventListener("click", () => {
      state.selectedTile = button.dataset.tileId;
      renderHand();
      renderControls();
    });
  });
}

function renderControls() {
  const playerIndex = state.currentTurn;
  const isHuman = state.playType === "local" || playerIndex === 0;
  const legal = getLegalMoves(playerIndex);

  const canDraw =
    state.playersCount === 2 &&
    state.variant !== "block" &&
    state.boneyard.length > 0 &&
    legal.length === 0 &&
    isHuman &&
    !state.finished &&
    !state.busy;

  const canPass =
    legal.length === 0 &&
    (!state.boneyard.length || state.variant === "block") &&
    isHuman &&
    !state.finished &&
    !state.busy;

  $("playLeftButton").disabled =
    !isHuman || !state.selectedTile ||
    !legal.some(move => move.tile.id === state.selectedTile && move.side === "left") ||
    state.finished || state.busy;

  $("playRightButton").disabled =
    !isHuman || !state.selectedTile ||
    !legal.some(move => move.tile.id === state.selectedTile && move.side === "right") ||
    state.finished || state.busy;

  $("drawTileButton").disabled = !canDraw;
  $("passTurnButton").disabled = !canPass;

  $("drawTileButton").textContent =
    `اسحب قطعة (${state.boneyard.length})`;
}

function renderAll() {
  if (!state.players.length) return;

  renderSeats();
  renderBoard();
  renderHand();
  renderControls();

  $("gameInfo").textContent =
    `${variantName()} • ${state.playersCount} لاعبين • الجولة ${state.round}`;
}

function variantName() {
  return {
    draw: "دومينو السحب",
    block: "دومينو البلوك",
    fives: "دومينو الخمسات"
  }[state.variant];
}

function setStatus(message) {
  $("gameStatus").textContent = message;
}

function startNextRound() {
  state.round++;
  dealRound();
  renderAll();

  setStatus(`بدأت الجولة ${state.round}. الدور على ${state.players[state.currentTurn].name}.`);

  if (state.playType === "ai" && state.currentTurn !== 0) {
    scheduleAI();
  }
}

function startGame() {
  if (state.playType === "online") {
    toast("اللعب الأونلاين يحتاج ربط نظام المباريات وقاعدة البيانات أولاً.");
    return;
  }

  state.variant = document.querySelector("[data-variant].active")?.dataset.variant || "draw";
  state.playersCount = Number(document.querySelector("[data-players].active")?.dataset.players || 2);
  state.playType = document.querySelector("[data-playtype].active")?.dataset.playtype || "ai";
  state.aiLevel = $("aiLevel").value;

  const selectedTarget = $("targetScore").value;
  state.targetScore = selectedTarget === "custom"
    ? Number($("customScore").value)
    : Number(selectedTarget);

  if (!Number.isFinite(state.targetScore) || state.targetScore < 50) {
    toast("اكتب عدد نقاط صحيح لا يقل عن 50.");
    return;
  }

  if (state.playType === "local" && state.playersCount < 2) {
    toast("يجب وجود لاعبين على الأقل.");
    return;
  }

  state.scores = Array(state.playersCount).fill(0);
  state.round = 1;

  createPlayers();
  dealRound();

  state.started = true;
  state.finished = false;

  $("setupScreen").style.display = "none";
  $("gameScreen").style.display = "block";

  renderAll();

  setStatus(`بدأت المباراة. أول دور: ${state.players[state.currentTurn].name}.`);

  if (state.playType === "ai" && state.currentTurn !== 0) {
    scheduleAI();
  }
}

function returnToSetup() {
  state.started = false;
  state.finished = false;
  state.players = [];
  state.board = [];
  state.boneyard = [];
  state.selectedTile = null;

  $("gameScreen").style.display = "none";
  $("setupScreen").style.display = "block";
}

function openModal(id) {
  $(id)?.classList.add("open");
}

function closeModal(id) {
  $(id)?.classList.remove("open");
}

function selectExclusive(containerId, selector) {
  const container = $(containerId);
  if (!container) return;

  container.querySelectorAll(selector).forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(selector).forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");

      if (containerId === "playerOptions") {
        state.playersCount = Number(button.dataset.players);
        updateDealDescription();
      }

      if (containerId === "playTypeOptions") {
        $("aiSettings").classList.toggle(
          "hidden",
          button.dataset.playtype !== "ai"
        );
      }
    });
  });
}

function updateRoomCodeVisibility() {
  const privateRoom = $("roomVisibility").value === "private";
  $("roomCodeGroup").classList.toggle("hidden", !privateRoom);
}

function bindEvents() {
  selectExclusive("variantOptions", "[data-variant]");
  selectExclusive("playerOptions", "[data-players]");
  selectExclusive("playTypeOptions", "[data-playtype]");

  $("startGameButton").addEventListener("click", startGame);

  $("playLeftButton").addEventListener("click", () => {
    if (!state.selectedTile) return;
    playTile(state.currentTurn, state.selectedTile, "left");
  });

  $("playRightButton").addEventListener("click", () => {
    if (!state.selectedTile) return;
    playTile(state.currentTurn, state.selectedTile, "right");
  });

  $("drawTileButton").addEventListener("click", drawTile);
  $("passTurnButton").addEventListener("click", passTurn);

  $("leaveGameButton").addEventListener("click", () => {
    if (confirm("هل تريد مغادرة الطاولة والعودة للإعدادات؟")) {
      returnToSetup();
    }
  });

  $("gameRulesButton").addEventListener("click", () => openModal("rulesModal"));
  $("rulesButton").addEventListener("click", () => openModal("rulesModal"));

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) {
        backdrop.classList.remove("open");
      }
    });
  });

  $("targetScore").addEventListener("change", () => {
    $("customScore").classList.toggle(
      "hidden",
      $("targetScore").value !== "custom"
    );
  });

  $("roomVisibility").addEventListener("change", updateRoomCodeVisibility);

  $("createRoomButton").addEventListener("click", () => {
    $("roomModalTitle").textContent = "إنشاء طاولة جديدة";
    $("roomCodeGroup").classList.add("hidden");
    openModal("roomModal");
  });

  $("joinRoomButton").addEventListener("click", () => {
    $("roomModalTitle").textContent = "دخول طاولة";
    $("roomCodeGroup").classList.remove("hidden");
    $("roomVisibility").value = "private";
    openModal("roomModal");
  });

  $("confirmRoomButton").addEventListener("click", () => {
    toast("نظام الغرف يحتاج ربطه بقاعدة بيانات الغرف قبل إنشاء طاولة فعلية.");
  });

  $("quickMatchButton").addEventListener("click", () => {
    toast("البحث عن لاعب أونلاين سيتاح بعد ربط نظام المطابقة.");
  });

  $("inviteFriendButton").addEventListener("click", () => {
    toast("دعوات الأصدقاء ستعمل بعد ربط نظام الدعوات.");
  });
}

function init() {
  bindEvents();
  updateDealDescription();

  $("aiSettings").classList.remove("hidden");
  $("customScore").classList.add("hidden");
}

init();
