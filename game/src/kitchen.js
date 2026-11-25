// The kitchen's rules and state, with no drawing and no browser in it: the order board, the
// assembly plate, the shift clock, score, combo and lives. Actions (add, serve, select, clear)
// are methods the caller drives; step() advances the clocks and returns what happened as bit
// flags, so the caller can react without the world knowing about screens or sound. Nothing here
// allocates after createKitchen returns, and the only randomness comes from the seeded generator.

import { DISHES, INGREDIENTS, LEVEL, LIVES, ORDER, SCORE, SHIFT } from './config.js';

export const EVENT_ADD = 1;
export const EVENT_SERVED = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_OVER = 8;
export const EVENT_SELECT = 16;
export const EVENT_CLEAR = 32;

/** How many of the plate may be stacked before it is full. */
const PLATE_MAX = 6;

function countsOf(list) {
  const counts = {};
  for (const id of list) counts[id] = (counts[id] || 0) + 1;
  return counts;
}

/** True when the plate holds exactly the recipe's ingredients, in any order. */
function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.length) return false;
  const have = countsOf(plate);
  const want = countsOf(recipe);
  for (const id of Object.keys(want)) if (have[id] !== want[id]) return false;
  return true;
}

export function createKitchen(random) {
  const state = {
    orders: [],
    plate: [],
    selectedId: null,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    lives: LIVES,
    shiftLeft: SHIFT.seconds,
    level: 1,
    elapsed: 0,
    spawnTimer: ORDER.firstSpawn,
    nextOrderId: 1,
    over: false,
    overReason: '',
  };

  function reset() {
    state.orders.length = 0;
    state.plate.length = 0;
    state.selectedId = null;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.missed = 0;
    state.lives = LIVES;
    state.shiftLeft = SHIFT.seconds;
    state.level = 1;
    state.elapsed = 0;
    state.spawnTimer = ORDER.firstSpawn;
    state.nextOrderId = 1;
    state.over = false;
    state.overReason = '';
  }

  /** The dishes the current level may ask for. */
  function openDishes() {
    return DISHES.filter((dish) => dish.minLevel <= state.level);
  }

  function spawnOrder() {
    const dishes = openDishes();
    const dish = dishes[Math.floor(random() * dishes.length)];
    const timeMax = Math.max(ORDER.minTime, ORDER.time - (state.level - 1) * ORDER.timePerLevel);
    const order = {
      id: state.nextOrderId,
      dish: dish.name,
      recipe: dish.recipe.slice(),
      timeLeft: timeMax,
      timeMax,
    };
    state.nextOrderId += 1;
    state.orders.push(order);
    if (state.selectedId === null) state.selectedId = order.id;
    return order;
  }

  function spawnInterval() {
    return Math.max(
      ORDER.minInterval,
      ORDER.interval - (state.level - 1) * ORDER.intervalPerLevel,
    );
  }

  /**
   * One fixed step. With `harmless` set (the title screen's backdrop) tickets arrive but never
   * expire and the shift clock never runs down, so the kitchen behind the title stays lively.
   */
  function step(dt, harmless) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (!harmless) state.shiftLeft -= dt;

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.orders.length < ORDER.maxActive) spawnOrder();
      state.spawnTimer += spawnInterval();
    }

    if (!harmless) {
      for (let index = state.orders.length - 1; index >= 0; index -= 1) {
        const order = state.orders[index];
        order.timeLeft -= dt;
        if (order.timeLeft > 0) continue;
        state.orders.splice(index, 1);
        state.missed += 1;
        state.combo = 0;
        state.lives -= 1;
        events |= EVENT_EXPIRED;
        if (state.selectedId === order.id) {
          state.selectedId = state.orders.length > 0 ? state.orders[0].id : null;
        }
        if (state.lives <= 0) {
          state.over = true;
          state.overReason = 'out of lives';
          events |= EVENT_OVER;
          break;
        }
      }
      if (!state.over && state.shiftLeft <= 0) {
        state.shiftLeft = 0;
        state.over = true;
        state.overReason = 'shift complete';
        events |= EVENT_OVER;
      }
    }
    return events;
  }

  /** The ticket the plate is cooking for, or null when no ticket is selected. */
  function selectedOrder() {
    for (const order of state.orders) if (order.id === state.selectedId) return order;
    return null;
  }

  /** The first ticket whose recipe the plate matches exactly, or null when none matches. */
  function matchingOrder() {
    for (const order of state.orders) {
      if (plateMatchesRecipe(state.plate, order.recipe)) return order;
    }
    return null;
  }

  /** Add one ingredient to the plate; returns EVENT_ADD, or 0 when the plate is full or done. */
  function addIngredient(id) {
    if (state.over || state.plate.length >= PLATE_MAX) return 0;
    if (!INGREDIENTS.some((ingredient) => ingredient.id === id)) return 0;
    state.plate.push(id);
    return EVENT_ADD;
  }

  /** Take the last ingredient off the plate; returns true when one was taken. */
  function removeLastIngredient() {
    if (state.plate.length === 0) return false;
    state.plate.pop();
    return true;
  }

  /** Empty the plate; returns EVENT_CLEAR, or 0 when it was already empty. */
  function clearPlate() {
    if (state.plate.length === 0) return 0;
    state.plate.length = 0;
    return EVENT_CLEAR;
  }

  /** Cook for the ticket with `id`; returns EVENT_SELECT, or 0 when there is no such ticket. */
  function selectOrder(id) {
    if (!state.orders.some((order) => order.id === id)) return 0;
    state.selectedId = id;
    return EVENT_SELECT;
  }

  /** Move the selection to the next ticket (or the previous one with `direction` -1). */
  function cycleOrder(direction) {
    if (state.orders.length === 0) return 0;
    const index = state.orders.findIndex((order) => order.id === state.selectedId);
    const next = (index + direction + state.orders.length) % state.orders.length;
    state.selectedId = state.orders[next].id;
    return EVENT_SELECT;
  }

  /**
   * Serve the plate when it matches a ticket: the ticket leaves the board, the score grows by the
   * base plus a bonus for the seconds still on that ticket's clock, times the combo multiplier.
   * Returns EVENT_SERVED, or 0 when the plate matches no ticket.
   */
  function servePlate() {
    if (state.over) return 0;
    const order = matchingOrder();
    if (order === null) return 0;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const multiplier = Math.min(SCORE.comboCap, 1 + SCORE.comboStep * (state.combo - 1));
    const points = Math.round((SCORE.serveBase + SCORE.timeBonus * order.timeLeft) * multiplier);
    state.score += points;
    state.served += 1;
    state.orders.splice(state.orders.indexOf(order), 1);
    state.plate.length = 0;
    if (state.selectedId === order.id) {
      state.selectedId = state.orders.length > 0 ? state.orders[0].id : null;
    }
    return EVENT_SERVED;
  }

  reset();
  return {
    state,
    reset,
    step,
    spawnOrder,
    selectedOrder,
    matchingOrder,
    addIngredient,
    removeLastIngredient,
    clearPlate,
    selectOrder,
    cycleOrder,
    servePlate,
  };
}
