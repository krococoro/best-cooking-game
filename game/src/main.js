// Boot and the one loop: input is read every frame, the kitchen advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=cover|mid|busy|title (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, INGREDIENTS, LAYOUT, STEP, binRect, ticketRect } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import {
  ACTION_CLEAR,
  ACTION_CONFIRM,
  ACTION_CYCLE_NEXT,
  ACTION_CYCLE_PREV,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_REMOVE_LAST,
  createInput,
} from './input.js';
import {
  EVENT_EXPIRED,
  EVENT_OVER,
  EVENT_SERVED,
  createKitchen,
} from './kitchen.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, kitchen, scene.screen, scene.best, sound.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startShift() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.start();
    announce('Cooking. Serve the tickets before their clocks run out.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (kitchen.state.score > best) {
      best = kitchen.state.score;
      saveBest(best);
    }
    sound.over();
    announce(`Shift over. Score ${kitchen.state.score}. Best ${best}.`);
  }

  /** Map a tap on the playfield onto bins, tickets, the serve button and the trash. */
  function handleClick(point) {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      sound.unlock();
      startShift();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const state = kitchen.state;
    for (let index = 0; index < 6; index += 1) {
      const rect = binRect(index);
      if (point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height) {
        sound.unlock();
        if (kitchen.addIngredient(INGREDIENTS[index].id)) sound.add();
        return;
      }
    }
    for (let index = 0; index < state.orders.length; index += 1) {
      const rect = ticketRect(index);
      if (point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height) {
        if (kitchen.selectOrder(state.orders[index].id)) sound.click();
        return;
      }
    }
    const serve = LAYOUT.serve;
    if (point.x >= serve.x && point.x < serve.x + serve.width && point.y >= serve.y && point.y < serve.y + serve.height) {
      if (kitchen.servePlate() & EVENT_SERVED) {
        sound.serve();
        announce(`Served. Score ${state.score}.`);
      }
      return;
    }
    const trash = LAYOUT.trash;
    if (point.x >= trash.x && point.x < trash.x + trash.width && point.y >= trash.y && point.y < trash.y + trash.height) {
      if (kitchen.clearPlate()) sound.click();
      return;
    }
    const plate = LAYOUT.plate;
    const dx = (point.x - plate.cx) / plate.rx;
    const dy = (point.y - plate.cy) / plate.ry;
    if (dx * dx + dy * dy <= 1 && kitchen.removeLastIngredient()) sound.click();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) sound.setMuted(!sound.isMuted());
    for (const id of input.takeDigits()) {
      if (screen === SCREEN_PLAY && kitchen.addIngredient(id)) sound.add();
    }
    for (const point of input.takeClicks()) handleClick(point);
    if (actions & ACTION_CONFIRM) {
      sound.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startShift();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Cooking.');
      } else if (kitchen.servePlate() & EVENT_SERVED) {
        sound.serve();
        announce(`Served. Score ${kitchen.state.score}.`);
      }
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_CYCLE_NEXT) {
      if (kitchen.cycleOrder(1)) sound.click();
    } else if (actions & ACTION_CYCLE_PREV) {
      if (kitchen.cycleOrder(-1)) sound.click();
    } else if (actions & ACTION_REMOVE_LAST) {
      if (kitchen.removeLastIngredient()) sound.click();
    } else if (actions & ACTION_CLEAR) {
      if (kitchen.clearPlate()) sound.click();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      kitchen.step(STEP, true);
      return;
    }
    const events = kitchen.step(STEP, false);
    if (events & EVENT_SERVED) announce(`Served. Score ${kitchen.state.score}.`);
    if (events & EVENT_EXPIRED) {
      sound.expire();
      announce(`A ticket expired. ${kitchen.state.lives} ${kitchen.state.lives === 1 ? 'life' : 'lives'} left.`);
    }
    if (events & EVENT_OVER) endShift();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, kitchen, screen, best, sound.isMuted());
  }

  // Leaving the tab pauses a running shift rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
