// Keyboard and pointer input. Held keys are not needed here: every press is a one-shot action
// (add an ingredient, serve, pick a ticket, pause) queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. Pointer taps are
// queued as logical playfield points the loop maps onto bins, tickets and buttons.

import { INGREDIENTS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_REMOVE_LAST = 4;
export const ACTION_CLEAR = 8;
export const ACTION_CYCLE_NEXT = 16;
export const ACTION_CYCLE_PREV = 32;
export const ACTION_MUTE = 64;

const DIGITS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6']);
const NUMPAD = new Set(['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas, toLogical) {
  let actions = 0;
  const digits = [];
  const clicks = [];

  window.addEventListener('keydown', (event) => {
    if (DIGITS.has(event.code) || NUMPAD.has(event.code)) {
      const index = Number(event.code.slice(-1)) - 1;
      if (index >= 0 && index < INGREDIENTS.length) digits.push(INGREDIENTS[index].id);
    } else if (event.code === 'Backspace') actions |= ACTION_REMOVE_LAST;
    else if (event.code === 'KeyC') actions |= ACTION_CLEAR;
    else if (event.code === 'Tab' || event.code === 'ArrowDown') actions |= ACTION_CYCLE_NEXT;
    else if (event.code === 'ArrowUp') actions |= ACTION_CYCLE_PREV;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    if (point !== null) clicks.push(point);
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The ingredient ids whose number keys were pressed since the last call, in order. */
    takeDigits() {
      return digits.splice(0, digits.length);
    },
    /** The logical playfield points tapped since the last call, in order. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
