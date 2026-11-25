// The screenshot scenes behind ?shot=cover|mid|busy|title. Each one plays the real rules
// forward from a fresh kitchen for a fixed number of steps, steered by a simple autopilot
// (cook for the oldest ticket, add its next missing ingredient, serve when the plate matches),
// so the frame is what a short shift really looks like and the same seed always gives the same
// frame. The cover stops with a finished dish on the plate, ready to serve.
import { STEP } from './config.js';
import { EVENT_OVER } from './kitchen.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Seconds of play before each scene's frame, and how often the autopilot acts. */
const SCENES = {
  cover: { seconds: 30, actEvery: 0.35, mode: 'ready' },
  mid: { seconds: 16, actEvery: 0.35, mode: 'mid' },
  busy: { seconds: 52, actEvery: 0.25, mode: 'serve' },
  title: { seconds: 8, actEvery: 0, mode: 'ambient' },
};
const SAMPLE = STEP;

/** The next ingredient the selected ticket still needs, or null when the plate is complete. */
function nextMissingIngredient(kitchen) {
  const order = kitchen.selectedOrder();
  if (order === null) return null;
  const have = {};
  for (const id of kitchen.state.plate) have[id] = (have[id] || 0) + 1;
  const want = {};
  for (const id of order.recipe) want[id] = (want[id] || 0) + 1;
  for (const id of Object.keys(want)) {
    if ((have[id] || 0) < want[id]) return id;
  }
  return null;
}

/** One autopilot beat: pick the oldest ticket, add what it needs, serve when it matches. */
function autopilotBeat(kitchen) {
  const state = kitchen.state;
  if (state.orders.length === 0) return;
  if (kitchen.selectedOrder() === null) kitchen.selectOrder(state.orders[0].id);
  if (kitchen.matchingOrder() !== null) {
    kitchen.servePlate();
    return;
  }
  const next = nextMissingIngredient(kitchen);
  if (next !== null) kitchen.addIngredient(next);
}

/** Run the kitchen forward for `seconds`, the autopilot acting every `actEvery` seconds. */
function playForward(kitchen, seconds, actEvery) {
  let actionTimer = 0;
  for (let t = 0; t < seconds; t += SAMPLE) {
    actionTimer += SAMPLE;
    if (actEvery > 0 && actionTimer >= actEvery) {
      actionTimer = 0;
      autopilotBeat(kitchen);
    }
    if (kitchen.step(SAMPLE, false) & EVENT_OVER) break;
  }
}

/**
 * Stage the plate for a finished dish: pick the ticket with the most time left, clear the
 * plate and add exactly its recipe, so the frame shows a plate ready to serve.
 */
function stageReadyPlate(kitchen) {
  const state = kitchen.state;
  let best = null;
  for (const order of state.orders) {
    if (best === null || order.timeLeft > best.timeLeft) best = order;
  }
  if (best === null) {
    kitchen.spawnOrder();
    best = state.orders[state.orders.length - 1];
  }
  kitchen.clearPlate();
  kitchen.selectOrder(best.id);
  for (const id of best.recipe) kitchen.addIngredient(id);
}

/** Stage a dish mid-assembly: the selected ticket's first two ingredients on the plate. */
function stageMidPlate(kitchen) {
  const state = kitchen.state;
  if (state.orders.length === 0) kitchen.spawnOrder();
  const order = kitchen.selectedOrder() || state.orders[0];
  kitchen.clearPlate();
  kitchen.selectOrder(order.id);
  const partial = order.recipe.slice(0, Math.min(2, order.recipe.length - 1));
  for (const id of partial) kitchen.addIngredient(id);
}

/**
 * Set `kitchen` to the named scene (cover, mid, busy or title; any other name is title) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, kitchen) {
  const scene = SCENES[name] || SCENES.title;
  kitchen.reset();
  if (scene.mode === 'ambient') {
    for (let t = 0; t < scene.seconds; t += SAMPLE) kitchen.step(SAMPLE, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  playForward(kitchen, scene.seconds, scene.actEvery);
  // A full board reads better than a near-empty one: top the tickets back up to three.
  while (kitchen.state.orders.length < 3) kitchen.spawnOrder();
  if (scene.mode === 'ready') stageReadyPlate(kitchen);
  // The mid and busy frames both show a dish half built; the busy one just has the higher
  // score, level and served count of a longer shift behind it. (Keyed on the scene name:
  // the busy scene's mode is 'serve', so a mode check would never match it.)
  else if (name === 'mid' || name === 'busy') stageMidPlate(kitchen);
  const over = kitchen.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: kitchen.state.score };
}

/** The scenes the entry's screenshots are taken from, in the order they are named. */
export const SHOT_NAMES = ['cover', 'mid', 'busy', 'title'];
