import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 25;
const SKINS = {
  lime: { name: "Лайм", head: "#d4ff87", body: "#8bcf57", dark: "#4e913e", emoji: "🍃" },
  ocean: { name: "Океан", head: "#b4efff", body: "#55bde8", dark: "#2678bd", emoji: "🌊" },
  berry: { name: "Ягода", head: "#ffb0d0", body: "#ee70a4", dark: "#a93870", emoji: "🍓" },
  gold: { name: "Золото", head: "#ffe9a0", body: "#f5bd45", dark: "#b97b26", emoji: "👑" },
  ghost: { name: "Призрак", head: "#fff", body: "#d2d4ff", dark: "#8d91d6", emoji: "👻" },
  fire: { name: "Огонь", head: "#ffc28a", body: "#ff744f", dark: "#b9322e", emoji: "🔥" },
};
const LEVELS = {
  garden: { name: "Сад", icon: "🌿", description: "Просторная карта для тренировки", blocks: 12 },
  temple: { name: "Храм", icon: "🗿", description: "Средняя сложность и узкие проходы", blocks: 28 },
  volcano: { name: "Вулкан", icon: "🌋", description: "Много барьеров и мало свободного места", blocks: 45 },
};
const DIRECTIONS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function createBoard(levelKey) {
  const snake = [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }];
  const obstacles = [];
  for (let i = 0; i < LEVELS[levelKey].blocks; i += 1) {
    const x = (3 + i * 7 + Math.floor(i / 4) * 3) % SIZE;
    const y = (2 + i * 11 + Math.floor(i / 3) * 5) % SIZE;
    const nearStart = Math.abs(x - 5) < 4 && Math.abs(y - 12) < 4;
    if (!nearStart && !obstacles.some((p) => p.x === x && p.y === y)) obstacles.push({ x, y });
  }
  return { snake, obstacles };
}

function randomFruit(snake, obstacles) {
  let fruit;
  let attempts = 0;
  do {
    fruit = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    attempts += 1;
  } while (
    attempts < 2000 &&
    (snake.some((p) => p.x === fruit.x && p.y === fruit.y) ||
      obstacles.some((p) => p.x === fruit.x && p.y === fruit.y))
  );
  return fruit;
}

export default function App() {
  const [menu, setMenu] = useState("home");
  const [level, setLevel] = useState("garden");
  const [skin, setSkin] = useState("lime");
  const [speed, setSpeed] = useState(140);
  const [wrapWalls, setWrapWalls] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [bananas, setBananas] = useState(0);
  const [best, setBest] = useState(() => Number(window.localStorage.getItem("jungleSnakeBest") || 0));
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("Выбери уровень и нажми «Играть».");
  const [board, setBoard] = useState(() => createBoard("garden"));
  const [fruit, setFruit] = useState(() => randomFruit([{ x: 5, y: 12 }], []));
  const snakeRef = useRef(board.snake);
  const obstaclesRef = useRef(board.obstacles);
  const fruitRef = useRef(fruit);
  const directionRef = useRef(DIRECTIONS.right);
  const nextDirectionRef = useRef(DIRECTIONS.right);
  const statusRef = useRef("ready");
  const scoreRef = useRef(0);
  const audioRef = useRef(null);

  const syncStatus = (next) => { statusRef.current = next; setStatus(next); };
  const resetGame = useCallback((levelKey = level) => {
    const nextBoard = createBoard(levelKey);
    const nextFruit = randomFruit(nextBoard.snake, nextBoard.obstacles);
    snakeRef.current = nextBoard.snake;
    obstaclesRef.current = nextBoard.obstacles;
    fruitRef.current = nextFruit;
    directionRef.current = DIRECTIONS.right;
    nextDirectionRef.current = DIRECTIONS.right;
    setBoard(nextBoard);
    setFruit(nextFruit);
    scoreRef.current = 0;
    setScore(0);
    setBananas(0);
    syncStatus("ready");
    setMessage("Раунд готов. Нажми «Играть» или WASD.");
  }, [level]);

  const beep = useCallback(() => {
    if (!sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      const audio = audioRef.current;
      if (audio.state === "suspended") audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 660;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.08);
    } catch { /* Audio is optional. */ }
  }, [sound]);

  const endGame = useCallback((text) => {
    syncStatus("over");
    setBest((old) => { const next = Math.max(old, scoreRef.current); window.localStorage.setItem("jungleSnakeBest", String(next)); return next; });
    setMessage(text);
  }, []);

  const startGame = () => {
    if (statusRef.current === "over" || statusRef.current === "ready") resetGame(level);
    syncStatus("playing");
    setMenu("game");
    setMessage("Игра идёт! Собирай бананы.");
  };

  const togglePause = () => {
    if (statusRef.current === "over") return;
    if (statusRef.current === "ready") { startGame(); return; }
    if (statusRef.current === "paused") {
      syncStatus("playing");
      setMessage("Игра продолжается.");
    } else {
      syncStatus("paused");
      setMessage("Пауза. Нажми «Продолжить», чтобы вернуться в игру.");
    }
  };

  const turn = useCallback((name) => {
    if (statusRef.current !== "playing") return;
    const next = DIRECTIONS[name];
    const current = directionRef.current;
    if (next && !(next.x === -current.x && next.y === -current.y)) nextDirectionRef.current = next;
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      const map = { w: "up", arrowup: "up", a: "left", arrowleft: "left", s: "down", arrowdown: "down", d: "right", arrowright: "right" };
      if (map[key]) {
        event.preventDefault();
        if (statusRef.current === "ready") {
          syncStatus("playing");
          setMenu("game");
        }
        turn(map[key]);
      } else if (key === " " || key === "escape") {
        event.preventDefault();
        if (key === " ") togglePause();
        else setMenu("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (status !== "playing") return undefined;
    const timer = window.setInterval(() => {
      const snake = snakeRef.current;
      const obstacles = obstaclesRef.current;
      const direction = nextDirectionRef.current;
      directionRef.current = direction;
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
      if (wrapWalls) {
        head.x = (head.x + SIZE) % SIZE;
        head.y = (head.y + SIZE) % SIZE;
      } else if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE) {
        endGame("Упс, стена! Попробуй ещё раз или включи проход сквозь края в настройках.");
        return;
      }
      if (obstacles.some((p) => p.x === head.x && p.y === head.y)) {
        endGame("Барьер впереди! Обходи препятствия и планируй маршрут.");
        return;
      }
      const eating = head.x === fruitRef.current.x && head.y === fruitRef.current.y;
      const hitSelf = snake.some((p, index) =>
        p.x === head.x && p.y === head.y && !(index === snake.length - 1 && !eating)
      );
      if (hitSelf) {
        endGame("Не кусай себя! Ты врезался в собственный хвост.");
        return;
      }
      const nextSnake = [head, ...snake];
      if (!eating) nextSnake.pop();
      snakeRef.current = nextSnake;
      setBoard((old) => ({ ...old, snake: nextSnake }));
      if (eating) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        setBananas((n) => n + 1);
        setBest((old) => { const next = Math.max(old, scoreRef.current); window.localStorage.setItem("jungleSnakeBest", String(next)); return next; });
        const nextFruit = randomFruit(nextSnake, obstacles);
        fruitRef.current = nextFruit;
        setFruit(nextFruit);
        setMessage("Вкусно! +10 очков 🍌");
        beep();
      }
    }, speed);
    return () => window.clearInterval(timer);
  }, [status, speed, wrapWalls, endGame, beep]);

  const chooseLevel = (key) => {
    setLevel(key);
    const nextBoard = createBoard(key);
    const nextFruit = randomFruit(nextBoard.snake, nextBoard.obstacles);
    snakeRef.current = nextBoard.snake;
    obstaclesRef.current = nextBoard.obstacles;
    fruitRef.current = nextFruit;
    directionRef.current = DIRECTIONS.right;
    nextDirectionRef.current = DIRECTIONS.right;
    setBoard(nextBoard);
    setFruit(nextFruit);
    scoreRef.current = 0;
    setScore(0);
    setBananas(0);
    syncStatus("ready");
    setMessage("Выбран уровень «" + LEVELS[key].name + "». Нажми «Играть».");
  };

  const currentSkin = SKINS[skin];
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setMenu("home")} aria-label="Главное меню">JUNGLE <span>SNAKE</span></button>
        <div className="topbar-right"><span className="pill">ARCADE / 01</span><span className="desktop-hint">W A S D · управление</span><button className="button button-ghost" onClick={() => setMenu("home")}>☰ Меню</button></div>
      </header>
      <main>
        {menu === "home" && <section className="menu-card">
          <div className="eyebrow">Добро пожаловать в джунгли</div>
          <div className="hero-row"><div><h1>Готов к банановому забегу?</h1><p className="muted">Собирай бананы, избегай стен и барьеров. Чем дольше живёшь — тем выше счёт!</p></div><div className="hero-emoji">🐍</div></div>
          <h2>Выбор уровня</h2><div className="choice-grid">{Object.entries(LEVELS).map(([key, item]) => <button key={key} className={"choice " + (level === key ? "selected" : "")} onClick={() => chooseLevel(key)}><strong>{item.icon} {item.name}</strong><span>{item.description}</span></button>)}</div>
          <h2>Быстрый выбор скина</h2><div className="skin-grid">{Object.entries(SKINS).map(([key, item]) => <button key={key} className={"skin-choice " + (skin === key ? "selected" : "")} onClick={() => setSkin(key)}><span className="skin-dot" style={{ background: item.body }} />{item.name}</button>)}</div>
          <div className="button-row"><button className="button button-primary" onClick={startGame}>▶ Играть</button><button className="button button-ghost" onClick={() => setMenu("skins")}>🎨 Все скины</button><button className="button button-ghost" onClick={() => setMenu("settings")}>⚙ Настройки</button></div>
        </section>}
        {menu === "skins" && <section className="menu-card"><div className="section-heading"><div><div className="eyebrow">Персонализация</div><h1>Скин змейки</h1><p className="muted">Выбери цвет, который будет у твоей змейки.</p></div><button className="button button-ghost" onClick={() => setMenu("home")}>← Назад</button></div><div className="skin-cards">{Object.entries(SKINS).map(([key, item]) => <button key={key} className={"skin-card " + (skin === key ? "selected" : "")} onClick={() => setSkin(key)}><span className="skin-preview" style={{ background: item.body, boxShadow: "0 0 24px " + item.body + "55" }}>{item.emoji}</span><strong>{item.name}</strong><small>{skin === key ? "Выбран" : "Нажми, чтобы выбрать"}</small></button>)}</div><div className="button-row"><button className="button button-primary" onClick={() => { setMessage("Скин «" + currentSkin.name + "» применён."); setMenu("home"); }}>Применить скин</button></div></section>}
        {menu === "settings" && <section className="menu-card"><div className="section-heading"><div><div className="eyebrow">Настройки игры</div><h1>Подстрой под себя</h1></div><button className="button button-ghost" onClick={() => setMenu("home")}>← Назад</button></div><div className="settings-list"><label className="setting-row"><span><strong>Скорость змейки</strong><small>Быстрее — сложнее управлять.</small></span><select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="190">Медленная</option><option value="140">Обычная</option><option value="95">Быстрая</option></select></label><label className="setting-row"><span><strong>Проходить сквозь края</strong><small>Если выключено, стена завершает игру.</small></span><input type="checkbox" checked={wrapWalls} onChange={(e) => setWrapWalls(e.target.checked)} /></label><label className="setting-row"><span><strong>Показывать сетку</strong><small>Помогает планировать маршрут.</small></span><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /></label><label className="setting-row"><span><strong>Звуковой сигнал</strong><small>Короткий сигнал при сборе банана.</small></span><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /></label></div><div className="button-row"><button className="button button-primary" onClick={() => { setMessage("Настройки сохранены."); setMenu("home"); }}>Сохранить настройки</button><button className="button button-ghost" onClick={() => { setSpeed(140); setWrapWalls(false); setShowGrid(true); setSound(true); }}>По умолчанию</button></div></section>}
        <div className="game-layout">
          <section className="game-panel">
            <div className="stats"><div className="stat"><small>Счёт</small><strong>{score}</strong></div><div className="stat"><small>Рекорд</small><strong>{best}</strong></div><div className="stat"><small>Бананы 🍌</small><strong>{bananas}</strong></div></div>
            <div className="board-frame"><div className="board" role="img" aria-label="Игровое поле змейки" style={{ "--cell": "4%" }}>
              {Array.from({ length: SIZE * SIZE }, (_, index) => {
                const x = index % SIZE, y = Math.floor(index / SIZE);
                const isHead = board.snake[0]?.x === x && board.snake[0]?.y === y;
                const body = board.snake.some((p, i) => i > 0 && p.x === x && p.y === y);
                const block = board.obstacles.some((p) => p.x === x && p.y === y);
                const isFruit = fruit.x === x && fruit.y === y;
                return <div key={index} className={"cell " + (showGrid ? "grid-on " : "") + (block ? "obstacle " : "") + (isHead ? "snake-head " : "") + (body ? "snake-body " : "") + (isFruit ? "fruit " : "")} style={isHead || body ? { "--snake-color": isHead ? currentSkin.head : currentSkin.body, "--snake-dark": currentSkin.dark } : undefined}>{isFruit ? <span>🍌</span> : isHead ? <span className="eyes">••</span> : block ? <span className="rock">◆</span> : null}</div>;
              })}
            </div>
            {(status === "ready" || status === "over" || status === "paused") && <div className="board-overlay"><div className="overlay-card"><div className="overlay-emoji">{status === "over" ? "💥" : status === "paused" ? "Ⅱ" : "🍌"}</div><h2>{status === "over" ? "Раунд окончен" : status === "paused" ? "Пауза" : "Jungle Snake"}</h2><p>{status === "over" ? message : status === "paused" ? "Передохни — игра подождёт." : "Собирай бананы и обходи барьеры."}</p><button className="button button-primary" onClick={status === "paused" ? togglePause : startGame}>{status === "paused" ? "▶ Продолжить" : status === "over" ? "↻ Играть снова" : "▶ Начать игру"}</button></div></div>}
            </div></div>
            <div className="mobile-controls"><span /><button onClick={() => turn("up")}>W ▲</button><span /><button onClick={() => turn("left")}>A ◀</button><button onClick={() => turn("down")}>S ▼</button><button onClick={() => turn("right")}>D ▶</button></div>
            <div className="button-row game-actions"><button className="button button-ghost" onClick={togglePause}>{status === "paused" ? "▶ Продолжить" : "Ⅱ Пауза"}</button><button className="button button-ghost" onClick={() => { resetGame(level); setMenu("game"); }}>↻ Заново</button><button className="button button-danger" onClick={() => endGame("Ты завершил забег. Сменить уровень или скин можно в меню.")}>■ Завершить</button></div>
            <p className="status-message" aria-live="polite">{message}</p>
          </section>
          <aside className="sidebar">
            <section className="info-panel"><h2>🎮 Управление</h2><p>W — вверх, A — влево, S — вниз, D — вправо. Пробел — пауза. На телефоне используй кнопки под полем.</p><div className="keypad"><span /><b>W ↑</b><span /><b>A ←</b><b>S ↓</b><b>D →</b></div></section>
            <section className="info-panel"><h2>🗺 Уровень</h2><p>{LEVELS[level].icon} {LEVELS[level].name} — {LEVELS[level].description}.</p><span className="pill">СКИН: {currentSkin.name.toUpperCase()}</span></section>
            <section className="info-panel"><h2>📜 Правила</h2><p>🍌 Банан: +10 очков и змейка становится длиннее.</p><p>🧱 Барьер или собственное тело — конец раунда.</p><p>🏆 Рекорд сохраняется, пока открыта страница.</p></section>
          </aside>
        </div>
      </main>
      <footer>JUNGLE SNAKE · React + Vite · WASD</footer>
    </div>
  );
}
