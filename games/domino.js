
/* =========================================================
   HANOON WORLD — DOMINO ROYALE
   File: games/domino.js
   Engine: Double-Six Draw Dominoes
   Modes: AI / Local / Online / Friend Invite
   ========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const SUPABASE_URL = "https://gjtgvczvclfwvlvcquxh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_4DVTUZ-xTlqU2GpFvpb7lw_g-Kxomd4";

  const client = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  const state = {
    mode: "ai",
    difficulty: "medium",
    openingRule: "highest",
    targetScore: 100,
    drawRule: "until-playable",
    sound: true,
    vibration: false,

    user: null,
    profile: null,
    wallet: null,

    matchId: null,
    onlineStatus: null,
    channel: null,
    matchSubscription: null,
    inviteSubscription: null,
    matchmakingSubscription: null,

    board: [],
    hands: [[], []],
    stock: [],
    current: 0,
    firstPlayer: 0,
    selectedTile: null,
    moveCount: 0,
    passCount: 0,
    scores: [0, 0],
    round: 1,
    finished: false,
    busy: false,
    localHidden: false,
    localTurn: 0,
    aiTimer: null,
    selectedFriend: null,
    lastResult: null
  };

  const themes = {
    emerald: {
      felt: "#176044",
      felt2: "#10402d",
      wood: "#79502c"
    },
    midnight: {
      felt: "#17483d",
      felt2: "#092b27",
      wood: "#463a2c"
    },
    royal: {
      felt: "#24503e",
      felt2: "#102b22",
      wood: "#a17a42"
    },
    ocean: {
      felt: "#18516a",
      felt2: "#0c3047",
      wood: "#75533d"
    }
  };

  const tileThemes = {
    classic: {
      background: "linear-gradient(145deg,#fffef8,#d7d2bf)",
      color: "#203126",
      border: "#e4e0d0"
    },
    gold: {
      background: "linear-gradient(145deg,#fff2c7,#c79d4d)",
      color: "#3a2812",
      border: "#f2d28c"
    },
    dark: {
      background: "linear-gradient(145deg,#39433d,#121b17)",
      color: "#fff1c8",
      border: "#a88b55"
    }
  };

  const pipPositions = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  /* -------------------- BASIC HELPERS -------------------- */

  function message(id, text) {
    const el = $(id);
    if (el) el.textContent = text || "";
  }

  function toast(text) {
    const el = $("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function setLoading(show, title, description) {
    const el = $("loading");
    if (!el) return;
    el.classList.toggle("show", !!show);
    if (title) message("loadingTitle", title);
    if (description) message("loadingDescription", description);
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });
    $(id)?.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openModal(id) {
    $(id)?.classList.add("open");
  }

  function closeModal(id) {
    $(id)?.classList.remove("open");
  }

  function errorText(error) {
    const raw = error?.message || String(error || "حدث خطأ غير معروف");
    const translations = [
      ["authentication_required", "سجل الدخول أولًا."],
      ["Authentication required", "سجل الدخول أولًا."],
      ["friend_not_found", "لم يتم العثور على هذا العضو."],
      ["invalid_friend", "لا يمكنك دعوة نفسك."],
      ["game_unavailable", "اللعبة غير متاحة حاليًا."],
      ["invite_not_found", "الدعوة غير موجودة أو لم تعد متاحة."],
      ["invite_already_answered", "تم الرد على هذه الدعوة من قبل."],
      ["Match is not active", "المباراة لم تعد نشطة."],
      ["It is not your turn", "ليس دورك الآن."],
      ["You already have a legal tile", "لديك قطعة قانونية يمكنك لعبها."],
      ["You have a legal tile and cannot pass", "لديك حركة قانونية ولا يمكنك التمرير."],
      ["Boneyard is empty; pass if blocked", "كومة السحب فارغة. يمكنك تمرير الدور."],
      ["Draw before passing", "اسحب من الكومة قبل التمرير."],
      ["Tile does not match right end", "القطعة لا تطابق الطرف الأيمن."],
      ["Tile does not match left end", "القطعة لا تطابق الطرف الأيسر."],
      ["Tile is not in your hand", "هذه القطعة ليست في يدك."]
    ];

    for (const [key, value] of translations) {
      if (raw.includes(key)) return value;
    }
    return raw;
  }

  function playSound(type = "move") {
    if (!state.sound) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      const frequencies = {
        move: 480,
        draw: 350,
        win: 720,
        error: 180,
        click: 540
      };

      oscillator.frequency.value = frequencies[type] || 440;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.15
      );

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.16);
      oscillator.onended = () => context.close();
    } catch (_) {}
  }

  function vibrate() {
    if (state.vibration && navigator.vibrate) {
      navigator.vibrate(35);
    }
  }

  function setToggle(id, enabled) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("aria-pressed", String(!!enabled));
  }

  function randomId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function tilePoints(tile) {
    return Number(tile.a) + Number(tile.b);
  }

  function tileLabel(tile) {
    return `${tile.a} - ${tile.b}`;
  }

  function isDouble(tile) {
    return tile.a === tile.b;
  }

  function createDeck() {
    const deck = [];
    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        deck.push({
          id: `${a}-${b}`,
          a,
          b
        });
      }
    }
    return shuffle(deck);
  }

  function legalSides(tile, board) {
    if (!board.length) return ["right"];

    const left = board[0].left;
    const right = board[board.length - 1].right;
    const sides = [];

    if (tile.a === left || tile.b === left) sides.push("left");
    if (tile.a === right || tile.b === right) sides.push("right");

    return [...new Set(sides)];
  }

  function hasLegalMove(hand, board) {
    return hand.some(tile => legalSides(tile, board).length > 0);
  }

  function getNextPlayer(player) {
    return player === 0 ? 1 : 0;
  }

  function currentHand() {
    return state.hands[state.current] || [];
  }

  /* -------------------- DOMINO TILE DISPLAY -------------------- */

  function makeTileElement(tile, options = {}) {
    const el = document.createElement("div");
    el.className = "tile";

    if (isDouble(tile)) el.classList.add("double");
    if (options.legal) el.classList.add("legal");
    if (options.selected) el.classList.add("selected");
    if (options.disabled) el.classList.add("disabled-tile");

    el.dataset.tileId = tile.id;
    el.setAttribute("aria-label", tileLabel(tile));

    const style = tileThemes[$("tileStyle")?.value || "classic"];
    el.style.background = style.background;
    el.style.color = style.color;
    el.style.borderColor = style.border;

    const first = document.createElement("div");
    const second = document.createElement("div");

    first.className = "tile-half";
    second.className = "tile-half";

    first.appendChild(makePips(tile.a));
    second.appendChild(makePips(tile.b));

    el.append(first, second);

    return el;
  }

  function makePips(number) {
    const grid = document.createElement("div");
    grid.className = "pips";

    const active = pipPositions[number] || [];

    for (let i = 0; i < 9; i++) {
      const pip = document.createElement("span");
      if (active.includes(i)) pip.className = "pip";
      grid.appendChild(pip);
    }

    return grid;
  }

  function renderHand() {
    const handElement = $("playerHand");
    if (!handElement) return;

    handElement.replaceChildren();

    if (state.mode === "local" && state.localHidden) {
      const cover = document.createElement("div");
      cover.className = "friend-empty";
      cover.textContent = "مرر الجهاز للاعب التالي ثم اضغط لإظهار قطعه.";
      cover.style.cursor = "pointer";
      cover.addEventListener("click", () => {
        state.localHidden = false;
        render();
      });
      handElement.appendChild(cover);
      message("handHelp", "القطع مخفية حتى يستلم اللاعب دوره.");
      return;
    }

    const hand = currentHand();
    const isMyTurn = state.mode !== "local" || state.current === state.localTurn;
    const canPlay = isMyTurn && !state.finished && !state.busy;

    if (!hand.length) {
      const empty = document.createElement("div");
      empty.className = "friend-empty";
      empty.textContent = "لا توجد قطع في يد هذا اللاعب.";
      handElement.appendChild(empty);
    }

    hand.forEach(tile => {
      const legal = legalSides(tile, state.board).length > 0;
      const element = makeTileElement(tile, {
        legal: legal && canPlay,
        selected: state.selectedTile === tile.id,
        disabled: !legal || !canPlay
      });

      if (canPlay) {
        element.addEventListener("click", () => {
          state.selectedTile = tile.id;
          renderHand();
          message(
            "gameMessage",
            legal
              ? "اسحب القطعة إلى الطرف الأيسر أو الأيمن."
              : "هذه القطعة غير قانونية حاليًا."
          );
        });

        element.addEventListener("pointerdown", event => {
          if (!legal || state.busy) return;
          beginDrag(event, tile, element);
        });
      }

      handElement.appendChild(element);
    });

    message("handCount", `${hand.length} قطع`);

    if (state.mode === "local") {
      message("handHelp", `قطع اللاعب ${state.current + 1}. بعد اللعب مرر الجهاز للاعب التالي.`);
    } else {
      message("handHelp", "القطع القانونية تضيء بالأبيض. اسحب القطعة إلى الطرف المطابق.");
    }
  }

  /* -------------------- DRAG AND DROP -------------------- */

  let dragData = null;

  function beginDrag(event, tile, element) {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    const ghost = makeTileElement(tile);
    ghost.classList.add("drag-ghost");
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    document.body.appendChild(ghost);

    dragData = {
      tile,
      ghost,
      pointerId: event.pointerId
    };

    element.setPointerCapture?.(event.pointerId);

    const move = e => {
      if (!dragData || e.pointerId !== dragData.pointerId) return;
      dragData.ghost.style.left = `${e.clientX}px`;
      dragData.ghost.style.top = `${e.clientY}px`;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      document.querySelectorAll(".board-end").forEach(el => {
        el.classList.toggle(
          "over",
          !!target?.closest(`[data-board-end="${el.dataset.boardEnd}"]`)
        );
      });
    };

    const end = async e => {
      if (!dragData || e.pointerId !== dragData.pointerId) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const drop = target?.closest("[data-board-end]");
      const side = drop?.dataset.boardEnd;

      dragData.ghost.remove();
      dragData = null;

      document.querySelectorAll(".board-end").forEach(el => el.classList.remove("over"));

      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointercancel", end);

      if (side) {
        await playTile(tile.id, side);
      } else {
        state.selectedTile = tile.id;
        renderHand();
      }
    };

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
  }

  /* -------------------- RENDER BOARD -------------------- */

  function renderBoard() {
    const chain = $("boardChain");
    const scroll = $("boardScroll");
    const empty = $("boardEmpty");

    if (!chain || !scroll || !empty) return;

    chain.replaceChildren();

    if (!state.board.length) {
      scroll.hidden = true;
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    scroll.hidden = false;

    state.board.forEach((placed, index) => {
      const tile = {
        id: placed.id,
        a: placed.left,
        b: placed.right
      };

      const element = makeTileElement(tile);
      element.title = `الحركة ${index + 1}`;
      chain.appendChild(element);
    });

    requestAnimationFrame(() => {
      scroll.scrollLeft = scroll.scrollWidth;
    });
  }

  function renderSeats() {
    const names = state.mode === "ai"
      ? ["أنت", "الذكاء الاصطناعي"]
      : state.mode === "local"
        ? ["اللاعب الأول", "اللاعب الثاني"]
        : ["أنت", "المنافس"];

    for (let i = 0; i < 2; i++) {
      const active = state.current === i && !state.finished;
      $(`seat${i + 1 === 1 ? "One" : "Two"}`)?.classList.toggle("active", active);
      message(`name${i + 1 === 1 ? "One" : "Two"}`, names[i]);
      message(`state${i + 1 === 1 ? "One" : "Two"}`,
        state.finished ? "انتهت المباراة" : active ? "دوره الآن" : "ينتظر دوره"
      );
      message(`pieces${i + 1 === 1 ? "One" : "Two"}`,
        `${state.hands[i]?.length || 0} قطع`
      );
    }
  }

  function render() {
    renderBoard();
    renderHand();
    renderSeats();

    const left = state.board.length ? state.board[0].left : "—";
    const right = state.board.length
      ? state.board[state.board.length - 1].right
      : "—";

    message("tableTurn", state.finished
      ? "انتهت المباراة"
      : state.mode === "local"
        ? `دور اللاعب ${state.current + 1}`
        : state.current === 0
          ? "دورك الآن"
          : "دور المنافس"
    );

    message("turnDescription", state.finished
      ? "انتهت الجولة"
      : state.current === 0
        ? "دورك الآن"
        : state.mode === "ai"
          ? "الذكاء الاصطناعي يفكر..."
          : "دور المنافس"
    );

    message("boneyardCount", `كومة السحب: ${state.stock.length}`);
    message("stockCount", state.stock.length);
    message("moveCount", state.moveCount);
    message("targetDisplay", state.targetScore);

    const drawButton = $("drawButton");
    const passButton = $("passButton");

    const myTurn = state.mode === "local" || state.current === 0;
    const legal = hasLegalMove(currentHand(), state.board);

    if (drawButton) {
      drawButton.disabled =
        state.finished ||
        state.busy ||
        !myTurn ||
        legal ||
        state.stock.length === 0 ||
        state.mode === "online";
    }

    if (passButton) {
      passButton.disabled =
        state.finished ||
        state.busy ||
        !myTurn ||
        legal ||
        state.stock.length > 0 ||
        state.mode === "online";
    }

    $("gameStatus")?.classList.toggle("finished", state.finished);
    message("gameStatus", state.finished ? "انتهت المباراة" : "مباراة جارية");

    const table = $("tableInner");
    const frame = $("tableFrame");
    const theme = themes[$("tableTheme")?.value || "emerald"];

    if (table) {
      table.style.background =
        `radial-gradient(ellipse at 50% 45%,${theme.felt} 0%,${theme.felt2} 100%)`;
    }
    if (frame) {
      frame.style.background =
        `linear-gradient(145deg,${theme.wood},#392619 45%,${theme.wood})`;
    }
  }

  /* -------------------- GAME START -------------------- */

  function resetRound() {
    state.board = [];
    state.hands = [[], []];
    state.stock = [];
    state.current = 0;
    state.firstPlayer = 0;
    state.selectedTile = null;
    state.moveCount = 0;
    state.passCount = 0;
    state.finished = false;
    state.busy = false;
    state.localHidden = false;
    state.localTurn = 0;
  }

  function startOfflineGame() {
    resetRound();

    const deck = createDeck();

    state.hands[0] = deck.splice(0, 7);
    state.hands[1] = deck.splice(0, 7);
    state.stock = deck;

    if (state.openingRule === "highest") {
      let bestPlayer = 0;
      let bestValue = -1;

      state.hands.forEach((hand, player) => {
        hand.forEach(tile => {
          if (isDouble(tile)) {
            const value = tile.a * 10 + tile.b;
            if (value > bestValue) {
              bestValue = value;
              bestPlayer = player;
            }
          }
        });
      });

      if (bestValue >= 0) {
        state.current = bestPlayer;
      } else {
        state.current = Math.random() < 0.5 ? 0 : 1;
      }
    } else {
      state.current = Math.random() < 0.5 ? 0 : 1;
    }

    state.firstPlayer = state.current;
    state.localTurn = state.current;

    message("gameSubtitle", state.mode === "ai"
      ? "DOMINO ROYALE • VS AI"
      : "DOMINO ROYALE • LOCAL MATCH"
    );

    showScreen("gameScreen");
    message("gameMessage", "بدأت المباراة. صاحب البداية يضع أول قطعة.");
    render();

    if (state.mode === "ai" && state.current === 1) {
      scheduleAI();
    }
  }

  async function startGame() {
    state.mode = document.querySelector(".mode-card.active")?.dataset.mode || "ai";
    state.difficulty = $("difficulty")?.value || "medium";
    state.openingRule = $("openingRule")?.value || "highest";
    state.targetScore = Number($("targetScore")?.value || 100);
    state.drawRule = $("drawRule")?.value || "until-playable";

    if (state.mode === "online") {
      await startOnlineMatchmaking();
      return;
    }

    if (state.mode === "ai" || state.mode === "local") {
      startOfflineGame();
    }
  }

  /* -------------------- OFFLINE PLAY -------------------- */

  function placeOfflineTile(tile, side) {
    const hand = currentHand();
    const index = hand.findIndex(item => item.id === tile.id);
    if (index < 0) throw new Error("القطعة غير موجودة في يد اللاعب.");

    if (!state.board.length) {
      state.board.push({
        id: tile.id,
        left: tile.a,
        right: tile.b,
        player: state.current
      });
    } else if (side === "right") {
      const end = state.board[state.board.length - 1].right;

      if (tile.a === end) {
        state.board.push({
          id: tile.id,
          left: tile.a,
          right: tile.b,
          player: state.current
        });
      } else if (tile.b === end) {
        state.board.push({
          id: tile.id,
          left: tile.b,
          right: tile.a,
          player: state.current
        });
      } else {
        throw new Error("القطعة لا تطابق الطرف الأيمن.");
      }
    } else {
      const end = state.board[0].left;

      if (tile.a === end) {
        state.board.unshift({
          id: tile.id,
          left: tile.b,
          right: tile.a,
          player: state.current
        });
      } else if (tile.b === end) {
        state.board.unshift({
          id: tile.id,
          left: tile.a,
          right: tile.b,
          player: state.current
        });
      } else {
        throw new Error("القطعة لا تطابق الطرف الأيسر.");
      }
    }

    hand.splice(index, 1);
    state.moveCount++;
    state.passCount = 0;
    state.selectedTile = null;

    playSound("move");
    vibrate();

    if (!hand.length) {
      finishOfflineGame(state.current, "empty_hand");
      return;
    }

    state.current = getNextPlayer(state.current);

    if (state.mode === "local") {
      state.localHidden = true;
      message("gameMessage", `تم وضع القطعة. مرر الجهاز للاعب ${state.current + 1}.`);
    } else {
      message("gameMessage", "تم وضع القطعة بنجاح.");
    }

    render();

    if (state.mode === "ai" && state.current === 1) {
      scheduleAI();
    }
  }

  async function drawOfflineTile() {
    const hand = currentHand();

    if (hasLegalMove(hand, state.board)) {
      toast("لديك قطعة قانونية بالفعل.");
      return;
    }

    if (!state.stock.length) {
      toast("كومة السحب فارغة. يمكنك تمرير الدور.");
      render();
      return;
    }

    const tile = state.stock.shift();
    hand.push(tile);
    state.moveCount++;

    playSound("draw");
    message("gameMessage", `سحبت قطعة ${tileLabel(tile)}.`);

    render();

    if (state.drawRule === "one-per-turn") {
      return;
    }

    while (
      !hasLegalMove(currentHand(), state.board) &&
      state.stock.length > 0
    ) {
      await sleep(250);
      const next = state.stock.shift();
      currentHand().push(next);
      state.moveCount++;
      render();
    }

    if (hasLegalMove(currentHand(), state.board)) {
      message("gameMessage", "وجدت قطعة قانونية. اخترها واسحبها إلى أحد الطرفين.");
    } else {
      message("gameMessage", "انتهت كومة السحب ولا توجد حركة قانونية. مرر الدور.");
    }

    render();
  }

  function passOfflineTurn() {
    if (hasLegalMove(currentHand(), state.board)) {
      toast("لا يمكنك التمرير ولديك حركة قانونية.");
      return;
    }

    if (state.stock.length) {
      toast("يجب أن تنفد كومة السحب أولًا.");
      return;
    }

    state.passCount++;
    state.moveCount++;

    if (state.passCount >= 2) {
      finishOfflineGame(null, "blocked");
      return;
    }

    state.current = getNextPlayer(state.current);

    if (state.mode === "local") {
      state.localHidden = true;
      message("gameMessage", `تم التمرير. مرر الجهاز للاعب ${state.current + 1}.`);
    } else {
      message("gameMessage", "تم تمرير الدور.");
    }

    render();

    if (state.mode === "ai" && state.current === 1) {
      scheduleAI();
    }
  }

  /* -------------------- AI ENGINE -------------------- */

  function chooseAIMove() {
    const hand = state.hands[1];
    const moves = [];

    hand.forEach(tile => {
      legalSides(tile, state.board).forEach(side => {
        moves.push({ tile, side });
      });
    });

    if (!moves.length) return null;

    const difficulty = state.difficulty;

    const scoreMove = move => {
      const { tile, side } = move;
      let score = tilePoints(tile) * 0.4;

      if (isDouble(tile)) score += 2.5;

      const remaining = hand.filter(item => item.id !== tile.id);
      const futureOptions = remaining.reduce((total, item) => {
        const left = state.board.length
          ? state.board[0].left
          : null;
        const right = state.board.length
          ? state.board[state.board.length - 1].right
          : null;

        return total +
          Number(item.a === left || item.b === left) +
          Number(item.a === right || item.b === right);
      }, 0);

      score += futureOptions * 0.9;

      const endValue = side === "right"
        ? state.board[state.board.length - 1]?.right
        : state.board[0]?.left;

      const remainingSame = remaining.filter(item =>
        item.a === endValue || item.b === endValue
      ).length;

      score += remainingSame * 0.7;

      return score;
    };

    if (difficulty === "easy") {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    if (difficulty === "medium") {
      moves.sort((a, b) => scoreMove(b) - scoreMove(a));
      return moves[Math.floor(Math.random() * Math.min(3, moves.length))];
    }

    moves.sort((a, b) => scoreMove(b) - scoreMove(a));

    if (difficulty === "hard") return moves[0];

    // Expert: prioritize preserving flexible numbers and doubles.
    const expertScore = move => {
      const base = scoreMove(move);
      const tile = move.tile;
      const remaining = hand.filter(item => item.id !== tile.id);

      const frequency = {};
      remaining.forEach(item => {
        frequency[item.a] = (frequency[item.a] || 0) + 1;
        frequency[item.b] = (frequency[item.b] || 0) + 1;
      });

      const flexibility = Object.values(frequency)
        .reduce((sum, value) => sum + value * value, 0);

      return base + flexibility * 0.65;
    };

    return moves.sort((a, b) => expertScore(b) - expertScore(a))[0];
  }

  async function aiTurn() {
    if (
      state.mode !== "ai" ||
      state.current !== 1 ||
      state.finished ||
      state.busy
    ) return;

    state.busy = true;
    render();

    await sleep(
      state.difficulty === "easy" ? 700 :
      state.difficulty === "medium" ? 950 : 1200
    );

    if (state.finished) return;

    let move = chooseAIMove();

    if (!move) {
      if (state.stock.length) {
        const tile = state.stock.shift();
        state.hands[1].push(tile);
        state.moveCount++;
        message("gameMessage", "الذكاء الاصطناعي يسحب قطعة.");
        playSound("draw");
        render();

        if (state.drawRule === "until-playable") {
          while (
            !hasLegalMove(state.hands[1], state.board) &&
            state.stock.length
          ) {
            await sleep(350);
            state.hands[1].push(state.stock.shift());
            state.moveCount++;
            render();
          }
        }

        move = chooseAIMove();
      }
    }

    if (move) {
      state.busy = false;
      placeOfflineTile(move.tile, move.side);
      return;
    }

    if (!state.stock.length) {
      state.busy = false;
      passOfflineTurn();
      return;
    }

    state.busy = false;
    render();
  }

  function scheduleAI() {
    clearTimeout(state.aiTimer);
    state.aiTimer = setTimeout(aiTurn, 400);
  }

  /* -------------------- END OF OFFLINE GAME -------------------- */

  function finishOfflineGame(winner, reason) {
    state.finished = true;
    state.busy = false;

    const points = state.hands.map(hand =>
      hand.reduce((sum, tile) => sum + tilePoints(tile), 0)
    );

    let actualWinner = winner;

    if (reason === "blocked") {
      if (points[0] < points[1]) actualWinner = 0;
      else if (points[1] < points[0]) actualWinner = 1;
      else actualWinner = null;
    }

    if (actualWinner !== null) {
      state.scores[actualWinner] += Math.max(1, points[getNextPlayer(actualWinner)]);
    }

    const title = actualWinner === null
      ? "تعادل"
      : actualWinner === 0
        ? "أحسنت! فزت بالمباراة"
        : state.mode === "ai"
          ? "فاز الذكاء الاصطناعي"
          : "فاز اللاعب الثاني";

    message("resultTitle", title);
    message("resultDescription",
      reason === "blocked"
        ? "أُغلقت الطاولة بعد نفاد كومة السحب وتمرير الدور."
        : "أنهى أحد اللاعبين جميع القطع الموجودة في يده."
    );

    message("resultMyScore", points[0]);
    message("resultOpponentScore", points[1]);
    message("resultMoves", state.moveCount);

    state.lastResult = { winner: actualWinner, reason, points };

    render();
    playSound(actualWinner === 0 ? "win" : "move");
    showScreen("resultScreen");
  }

  /* -------------------- ONLINE AUTH AND WALLET -------------------- */

  async function loadAccount() {
    if (!client) return;

    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    state.user = data.session?.user || null;
    if (!state.user) return;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id,username,full_name,nickname,member_code,avatar_path")
      .eq("id", state.user.id)
      .maybeSingle();

    if (!profileError) state.profile = profile;

    const { data: wallet, error: walletError } = await client
      .from("world_wallets")
      .select("coins,gems")
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (!walletError && wallet) {
      state.wallet = wallet;
      message("coinBalance", Number(wallet.coins || 0).toLocaleString("en-US"));
      message("gemBalance", Number(wallet.gems || 0).toLocaleString("en-US"));
    }
  }

  /* -------------------- FRIEND SEARCH / INVITE -------------------- */

  async function searchFriends() {
    if (!client) {
      message("friendMessage", "تعذر الاتصال بقاعدة البيانات.");
      return;
    }

    const query = $("friendQuery")?.value.trim();
    const results = $("friendResults");

    if (!query || query.length < 2) {
      message("friendMessage", "اكتب اسم المستخدم أو كود العضوية.");
      return;
    }

    if (!state.user) {
      message("friendMessage", "يجب تسجيل الدخول أولًا.");
      return;
    }

    results.replaceChildren();
    message("friendMessage", "جارٍ البحث...");

    const { data, error } = await client
      .from("member_directory")
      .select("id,username,member_code,full_name,avatar_path")
      .or(`username.ilike.%${query}%,member_code.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq("id", state.user.id)
      .limit(12);

    if (error) {
      message("friendMessage", errorText(error));
      return;
    }

    if (!data?.length) {
      const empty = document.createElement("div");
      empty.className = "friend-empty";
      empty.textContent = "لم يتم العثور على أعضاء بهذا الاسم أو الكود.";
      results.appendChild(empty);
      message("friendMessage", "");
      return;
    }

    data.forEach(profile => {
      const row = document.createElement("div");
      row.className = "friend-result";

      const avatar = document.createElement("div");
      avatar.className = "friend-avatar";

      if (profile.avatar_path) {
        const image = document.createElement("img");
        image.alt = "";
        image.src = profile.avatar_path;
        image.onerror = () => {
          image.remove();
          avatar.textContent = (profile.username || "؟").slice(0, 1);
        };
        avatar.appendChild(image);
      } else {
        avatar.textContent = (profile.username || profile.full_name || "؟").slice(0, 1);
      }

      const meta = document.createElement("div");
      meta.className = "friend-meta";

      const name = document.createElement("strong");
      name.textContent = profile.full_name || profile.username || "عضو";

      const code = document.createElement("small");
      code.textContent = profile.member_code
        ? `كود العضوية: ${profile.member_code}`
        : `@${profile.username || ""}`;

      meta.append(name, code);

      const invite = document.createElement("button");
      invite.type = "button";
      invite.className = "friend-invite";
      invite.textContent = "دعوة للعب";
      invite.addEventListener("click", () => inviteFriend(profile));

      row.append(avatar, meta, invite);
      results.appendChild(row);
    });

    message("friendMessage", `تم العثور على ${data.length} عضو.`);
  }

  async function inviteFriend(friend) {
    if (!client || !state.user) {
      toast("سجل الدخول أولًا.");
      return;
    }

    message("friendMessage", "جارٍ إرسال الدعوة...");

    const { data, error } = await client.rpc(
      "invite_world_game_friend",
      {
        p_game_slug: "domino",
        p_friend_id: friend.id
      }
    );

    if (error) {
      message("friendMessage", errorText(error));
      return;
    }

    state.selectedFriend = friend;
    message(
      "friendMessage",
      `تم إرسال الدعوة إلى ${friend.full_name || friend.username || "العضو"}. رقم الدعوة: ${data?.invite_id || "تم الإنشاء"}`
    );

    toast("تم إرسال دعوة الدومينو.");
  }

  /* -------------------- ONLINE MATCHMAKING -------------------- */

  async function startOnlineMatchmaking() {
    if (!client) {
      message("setupMessage", "تعذر تحميل اتصال قاعدة البيانات.");
      return;
    }

    if (!state.user) {
      message("setupMessage", "يجب تسجيل الدخول قبل اللعب أونلاين.");
      return;
    }

    setLoading(true, "جارٍ البحث عن منافس", "نتصل بنظام البحث عن اللاعبين.");

    try {
      const { data, error } = await client.rpc(
        "join_world_game_matchmaking",
        { p_game_slug: "domino" }
      );

      if (error) throw error;

      if (data?.status === "matched" && data.match_id) {
        await initializeOnlineMatch(data.match_id);
        return;
      }

      if (data?.status === "waiting") {
        setLoading(false);
        showScreen("waitingScreen");
        message("waitingMessage", "أنت في قائمة البحث. انتظر العثور على لاعب آخر.");
        await listenForMatch();
        return;
      }

      throw new Error("لم يتم تأكيد حالة البحث من قاعدة البيانات.");
    } catch (error) {
      setLoading(false);
      message("setupMessage", errorText(error));
      toast(errorText(error));
    }
  }

  async function listenForMatch() {
    if (!client || !state.user) return;

    if (state.matchmakingSubscription) {
      await client.removeChannel(state.matchmakingSubscription);
    }

    const channel = client.channel(`domino-matchmaking-${state.user.id}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "world_game_match_players",
        filter: `user_id=eq.${state.user.id}`
      },
      async payload => {
        const matchId = payload.new?.match_id;
        if (!matchId) return;

        await client.removeChannel(channel);
        state.matchmakingSubscription = null;
        await initializeOnlineMatch(matchId);
      }
    );

    state.matchmakingSubscription = channel;
    await channel.subscribe();
  }

  async function cancelMatchmaking() {
    if (!client) return;

    try {
      const { error } = await client.rpc("cancel_world_game_matchmaking");
      if (error) throw error;

      if (state.matchmakingSubscription) {
        await client.removeChannel(state.matchmakingSubscription);
        state.matchmakingSubscription = null;
      }

      showScreen("setupScreen");
      message("setupMessage", "تم إلغاء البحث.");
    } catch (error) {
      message("waitingMessage", errorText(error));
    }
  }

  /* -------------------- ONLINE MATCH INITIALIZATION -------------------- */

  async function initializeOnlineMatch(matchId) {
    if (!client || !matchId) return;

    setLoading(true, "تم العثور على منافس", "جارٍ تجهيز الطاولة وتوزيع القطع.");

    try {
      state.matchId = matchId;

      const { data: players, error: playersError } = await client
        .from("world_game_match_players")
        .select("user_id,seat")
        .eq("match_id", matchId)
        .order("seat");

      if (playersError) throw playersError;
      if (!players || players.length !== 2) {
        throw new Error("لم يكتمل عدد لاعبي المباراة بعد.");
      }

      const mine = players.findIndex(player => player.user_id === state.user.id);
      if (mine < 0) throw new Error("حسابك ليس مشاركًا في هذه المباراة.");

      state.onlineSeat = mine;
      state.onlinePlayers = players;

      const { data: initialized, error: initError } = await client.rpc(
        "initialize_world_domino_match",
        { p_match_id: matchId }
      );

      if (initError && !String(initError.message).includes("Already initialized")) {
        throw initError;
      }

      await refreshOnlineState();
      await subscribeToOnlineMatch();

      state.mode = "online";
      state.onlineStatus = "playing";

      message("gameSubtitle", "DOMINO ROYALE • ONLINE MATCH");
      showScreen("gameScreen");
      message("gameMessage", "اتصلت بالمنافس. ابدأ اللعب عندما يحين دورك.");
      setLoading(false);
      render();
    } catch (error) {
      setLoading(false);
      message("setupMessage", errorText(error));
      toast(errorText(error));
      showScreen("setupScreen");
    }
  }

  async function refreshOnlineState() {
    if (!client || !state.matchId) return;

    const { data: matchState, error: stateError } = await client
      .from("world_domino_match_state")
      .select("match_id,board,boneyard_count,current_turn_user_id,pass_count,move_count,status,version")
      .eq("match_id", state.matchId)
      .single();

    if (stateError) throw stateError;

    const { data: myHand, error: handError } = await client
      .from("world_domino_player_hands")
      .select("tiles")
      .eq("match_id", state.matchId)
      .eq("user_id", state.user.id)
      .single();

    if (handError) throw handError;

    state.board = Array.isArray(matchState.board) ? matchState.board : [];
    state.hands[0] = myHand?.tiles || [];
    state.hands[1] = [];
    state.stock = Array.from(
      { length: Number(matchState.boneyard_count || 0) },
      (_, index) => ({ id: `hidden-${index}`, a: 0, b: 0 })
    );

    state.current = matchState.current_turn_user_id === state.user.id ? 0 : 1;
    state.moveCount = Number(matchState.move_count || 0);
    state.passCount = Number(matchState.pass_count || 0);
    state.finished = matchState.status !== "playing";
    state.onlineStatus = matchState.status;

    const { data: players } = await client
      .from("world_game_match_players")
      .select("user_id,seat")
      .eq("match_id", state.matchId)
      .order("seat");

    state.onlinePlayers = players || [];
    renderOnlineSeats();
  }

  function renderOnlineSeats() {
    const players = state.onlinePlayers || [];
    const mine = players.find(player => player.user_id === state.user.id);
    const opponent = players.find(player => player.user_id !== state.user.id);

    const ownSeat = mine?.seat === 1 ? "One" : "Two";
    const otherSeat = ownSeat === "One" ? "Two" : "One";

    message(`name${ownSeat}`, state.profile?.full_name || state.profile?.username || "أنت");
    message(`name${otherSeat}`, "المنافس");

    message(`pieces${ownSeat}`, `${state.hands[0]?.length || 0} قطع`);
    message(`pieces${otherSeat}`, "قطع مخفية");

    $(`seat${ownSeat}`)?.classList.toggle("active", state.current === 0);
    $(`seat${otherSeat}`)?.classList.toggle("active", state.current === 1);

    message(`state${ownSeat}`, state.current === 0 ? "دورك الآن" : "ينتظر دورك");
    message(`state${otherSeat}`, state.current === 1 ? "دوره الآن" : "ينتظر دوره");
  }

  async function subscribeToOnlineMatch() {
    if (!client || !state.matchId) return;

    if (state.matchSubscription) {
      await client.removeChannel(state.matchSubscription);
    }

    const channel = client.channel(`domino:${state.matchId}`, {
      config: { private: true }
    });

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "world_domino_match_state",
        filter: `match_id=eq.${state.matchId}`
      },
      async () => {
        try {
          await refreshOnlineState();
          if (state.onlineStatus === "completed" || state.onlineStatus === "blocked") {
            await showOnlineResult();
          }
        } catch (error) {
          message("gameMessage", errorText(error));
        }
      }
    );

    state.matchSubscription = channel;
    await channel.subscribe();
  }

  async function onlineRPC(name, args) {
    if (!client || !state.matchId) throw new Error("لا توجد مباراة أونلاين نشطة.");

    state.busy = true;
    render();

    try {
      const { data, error } = await client.rpc(name, args);
      if (error) throw error;

      // The database is the source of truth. Always reload after a successful RPC.
      await refreshOnlineState();

      if (state.onlineStatus === "completed" || state.onlineStatus === "blocked") {
        await showOnlineResult();
      }

      return data;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function onlinePlay(tileId, side) {
    await onlineRPC("play_world_domino_tile", {
      p_match_id: state.matchId,
      p_tile_id: tileId,
      p_side: side
    });
  }

  async function onlineDraw() {
    await onlineRPC("draw_world_domino_tile", {
      p_match_id: state.matchId
    });
  }

  async function onlinePass() {
    await onlineRPC("pass_world_domino_turn", {
      p_match_id: state.matchId
    });
  }

  async function showOnlineResult() {
    const { data: match } = await client
      .from("world_game_matches")
      .select("winner_user_id,result,status")
      .eq("id", state.matchId)
      .maybeSingle();

    const winner = match?.winner_user_id;
    const iWon = winner === state.user.id;

    message("resultTitle",
      !winner ? "تعادل" : iWon ? "أحسنت! فزت بالمباراة" : "انتهت المباراة لصالح المنافس"
    );

    message("resultDescription",
      match?.result?.reason === "blocked"
        ? "أُغلقت الطاولة بعد نفاد كومة السحب."
        : "انتهت المباراة بعد خروج أحد اللاعبين من جميع قطعه."
    );

    message("resultMyScore", iWon ? "فوز" : winner ? "خسارة" : "تعادل");
    message("resultOpponentScore", winner ? (iWon ? "خسارة" : "فوز") : "تعادل");
    message("resultMoves", state.moveCount);

    state.finished = true;
    showScreen("resultScreen");
  }

  /* -------------------- CENTRAL PLAY ACTION -------------------- */

  async function playTile(tileId, side) {
    if (state.finished || state.busy) return;

    const tile = currentHand().find(item => item.id === tileId);
    if (!tile) {
      toast("القطعة غير موجودة في يدك.");
      return;
    }

    if (!legalSides(tile, state.board).includes(side)) {
      toast("هذه القطعة لا تطابق الطرف الذي اخترته.");
      state.selectedTile = null;
      renderHand();
      return;
    }

    try {
      if (state.mode === "online") {
        if (state.current !== 0) {
          toast("ليس دورك الآن.");
          return;
        }
        await onlinePlay(tileId, side);
      } else {
        placeOfflineTile(tile, side);
      }
    } catch (error) {
      toast(errorText(error));
      message("gameMessage", errorText(error));
      render();
    }
  }

  /* -------------------- FRIEND INVITE INBOX -------------------- */

  async function watchIncomingInvites() {
    if (!client || !state.user) return;

    if (state.inviteSubscription) {
      await client.removeChannel(state.inviteSubscription);
    }

    const channel = client.channel(`domino-invites-${state.user.id}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "world_game_match_invites",
        filter: `to_user_id=eq.${state.user.id}`
      },
      payload => {
        const invite = payload.new;
        if (invite?.status !== "pending") return;

        const accept = window.confirm("وصلتك دعوة للعب الدومينو. هل تريد قبولها؟");
        respondToInvite(invite.id, accept);
      }
    );

    state.inviteSubscription = channel;
    await channel.subscribe();
  }

  async function respondToInvite(inviteId, accept) {
    if (!client) return;

    try {
      const { data, error } = await client.rpc(
        "respond_world_game_invite",
        {
          p_invite_id: inviteId,
          p_accept: !!accept
        }
      );

      if (error) throw error;

      if (accept && data?.match_id) {
        await initializeOnlineMatch(data.match_id);
      } else {
        toast("تم رفض الدعوة.");
      }
    } catch (error) {
      toast(errorText(error));
    }
  }

  /* -------------------- LEAVE / CLEANUP -------------------- */

  async function cleanupSubscriptions() {
    if (!client) return;

    for (const key of [
      "matchSubscription",
      "inviteSubscription",
      "matchmakingSubscription"
    ]) {
      if (state[key]) {
        await client.removeChannel(state[key]);
        state[key] = null;
      }
    }
  }

  async function leaveGame() {
    if (state.mode === "online" && state.matchId) {
      const confirmLeave = window.confirm("هل تريد مغادرة شاشة المباراة؟");
      if (!confirmLeave) return;

      await cleanupSubscriptions();
      state.matchId = null;
      state.finished = true;
      showScreen("setupScreen");
      message("setupMessage", "غادرت شاشة المباراة. لم يتم حذف المباراة من قاعدة البيانات.");
      return;
    }

    if (!state.finished) {
      const confirmLeave = window.confirm("هل تريد إنهاء المباراة الحالية والعودة؟");
      if (!confirmLeave) return;
    }

    clearTimeout(state.aiTimer);
    resetRound();
    showScreen("setupScreen");
    message("setupMessage", "يمكنك بدء مباراة جديدة.");
  }

  /* -------------------- SETTINGS -------------------- */

  function setMode(mode) {
    state.mode = mode;

    document.querySelectorAll(".mode-card").forEach(card => {
      card.classList.toggle("active", card.dataset.mode === mode);
    });

    $("difficultyField")?.classList.toggle("disabled", mode !== "ai");
    $("friendPanel")?.toggleAttribute("hidden", mode !== "online");

    message("setupMessage",
      mode === "ai"
        ? "اختر مستوى الذكاء الاصطناعي ثم ابدأ."
        : mode === "local"
          ? "مباراة محلية بين لاعبين على نفس الجهاز."
          : "ابحث عن منافس عشوائي أو أرسل دعوة إلى صديق."
    );
  }

  function resetSettings() {
    $("difficulty").value = "medium";
    $("openingRule").value = "highest";
    $("targetScore").value = "100";
    $("tableTheme").value = "emerald";
    $("tileStyle").value = "classic";
    $("drawRule").value = "until-playable";

    state.sound = true;
    state.vibration = false;

    setToggle("soundToggle", true);
    setToggle("vibrationToggle", false);
    setToggle("modalSoundToggle", true);
    setToggle("modalVibrationToggle", false);

    message("setupMessage", "تمت استعادة الإعدادات الافتراضية.");
  }

  function toggleSound() {
    state.sound = !state.sound;
    setToggle("soundToggle", state.sound);
    setToggle("modalSoundToggle", state.sound);
    playSound("click");
  }

  function toggleVibration() {
    state.vibration = !state.vibration;
    setToggle("vibrationToggle", state.vibration);
    setToggle("modalVibrationToggle", state.vibration);
    vibrate();
  }

  /* -------------------- BUTTON EVENTS -------------------- */

  function bindEvents() {
    document.querySelectorAll(".mode-card").forEach(card => {
      card.addEventListener("click", () => setMode(card.dataset.mode));
    });

    $("startGame")?.addEventListener("click", startGame);
    $("resetSettings")?.addEventListener("click", resetSettings);

    $("searchFriend")?.addEventListener("click", searchFriends);
    $("friendQuery")?.addEventListener("keydown", event => {
      if (event.key === "Enter") searchFriends();
    });

    $("cancelSearch")?.addEventListener("click", cancelMatchmaking);

    $("drawButton")?.addEventListener("click", async () => {
      try {
        if (state.mode === "online") await onlineDraw();
        else await drawOfflineTile();
      } catch (error) {
        toast(errorText(error));
      }
    });

    $("passButton")?.addEventListener("click", async () => {
      try {
        if (state.mode === "online") await onlinePass();
        else passOfflineTurn();
      } catch (error) {
        toast(errorText(error));
      }
    });

    $("leaveButton")?.addEventListener("click", leaveGame);
    $("modalLeave")?.addEventListener("click", () => {
      closeModal("menuModal");
      leaveGame();
    });

    $("gameMenu")?.addEventListener("click", () => openModal("menuModal"));
    $("openRules")?.addEventListener("click", () => openModal("rulesModal"));

    $("soundToggle")?.addEventListener("click", toggleSound);
    $("modalSoundToggle")?.addEventListener("click", toggleSound);
    $("soundButton")?.addEventListener("click", toggleSound);

    $("vibrationToggle")?.addEventListener("click", toggleVibration);
    $("modalVibrationToggle")?.addEventListener("click", toggleVibration);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
      button.addEventListener("click", () => closeModal(button.dataset.closeModal));
    });

    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) backdrop.classList.remove("open");
      });
    });

    document.querySelectorAll("[data-board-end]").forEach(button => {
      button.addEventListener("click", () => {
        if (!state.selectedTile) {
          toast("اختر قطعة من يدك أولًا.");
          return;
        }
        playTile(state.selectedTile, button.dataset.boardEnd);
      });
    });

    $("playAgain")?.addEventListener("click", () => {
      if (state.mode === "online") {
        toast("للبدء أونلاين، ارجع للإعدادات وابحث عن منافس جديد.");
        showScreen("setupScreen");
        return;
      }
      startOfflineGame();
    });

    $("returnHome")?.addEventListener("click", () => {
      resetRound();
      showScreen("setupScreen");
    });

    $("tableTheme")?.addEventListener("change", render);
    $("tileStyle")?.addEventListener("change", render);
  }

  /* -------------------- INITIALIZATION -------------------- */

  async function init() {
    bindEvents();
    setMode("ai");
    resetSettings();

    if (!client) {
      message("setupMessage", "تعذر تحميل مكتبة الاتصال بقاعدة البيانات.");
      return;
    }

    try {
      await loadAccount();

      if (state.user) {
        await watchIncomingInvites();
      } else {
        message("setupMessage", "يمكنك اللعب ضد الكمبيوتر أو محليًا. سجّل الدخول للعب أونلاين.");
      }
    } catch (error) {
      message("setupMessage", errorText(error));
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
