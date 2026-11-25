// Every tuning number, colour, recipe and screen rectangle in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the size of the screen it is played on.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts 90 seconds; the game ends when the shift clock runs out or lives run out. */
export const SHIFT = { seconds: 90 };

export const LIVES = 3;

/** A level lasts 20 seconds of the shift; orders get faster and richer as levels rise. */
export const LEVEL = { seconds: 20, max: 5 };

export const ORDER = {
  /** Seconds until the first order ticket appears after a shift starts. */
  firstSpawn: 2,
  /** Seconds between new tickets; shrinks by intervalPerLevel each level, never below minInterval. */
  interval: 6,
  intervalPerLevel: 0.6,
  minInterval: 3.5,
  /** Seconds a ticket stays up; shrinks by timePerLevel each level, never below minTime. */
  time: 28,
  timePerLevel: 2,
  minTime: 15,
  /** How many tickets the order board holds at once. */
  maxActive: 3,
};

export const SCORE = {
  serveBase: 100,
  /** Bonus points per second still left on the served ticket's clock. */
  timeBonus: 5,
  /** Each serve in a row without a missed ticket adds this to the multiplier, up to comboCap. */
  comboStep: 0.25,
  comboCap: 2,
};

/** The six ingredients on the counter, in bin order, with the key that adds each one. */
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', color: '#e8a94e', dark: '#b97e2e' },
  { id: 'patty', name: 'Patty', key: '2', color: '#7a4a21', dark: '#54331a' },
  { id: 'lettuce', name: 'Lettuce', key: '3', color: '#69b34c', dark: '#3f7a2e' },
  { id: 'tomato', name: 'Tomato', key: '4', color: '#e23b2e', dark: '#a32418' },
  { id: 'cheese', name: 'Cheese', key: '5', color: '#f7c948', dark: '#c79a1d' },
  { id: 'sauce', name: 'Sauce', key: '6', color: '#ff7f2a', dark: '#c75a12' },
];

/** The dishes the truck serves, with the recipe each ticket asks for and the level it joins at. */
export const DISHES = [
  { name: 'Sunset Burger', recipe: ['bun', 'patty', 'cheese'], minLevel: 1 },
  { name: 'Garden Melt', recipe: ['bun', 'cheese', 'tomato'], minLevel: 1 },
  { name: 'Green Plate', recipe: ['lettuce', 'tomato', 'sauce'], minLevel: 1 },
  { name: 'Sunny Stack', recipe: ['patty', 'lettuce', 'sauce'], minLevel: 2 },
  { name: 'Golden Double', recipe: ['bun', 'patty', 'cheese', 'tomato'], minLevel: 3 },
];

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#4a3423',
  wallTrim: '#6b4a2e',
  floor: '#2c2118',
  counter: '#8a5a33',
  counterEdge: '#a9743f',
  board: '#f5e6c8',
  ticket: '#fff7e0',
  ticketEdge: '#d9b36c',
  hud: '#1d130c',
  text: '#f8f1e4',
  muted: '#c9b18a',
  gold: '#f2c94c',
  green: '#7bc96f',
  greenDark: '#3f7a2e',
  red: '#e5534b',
  plate: '#f8f4ec',
  plateRim: '#d9c9a8',
  button: '#7bc96f',
  buttonText: '#14301a',
  buttonDisabled: '#5a5148',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';

/** Screen rectangles, in logical playfield coordinates; the renderer and the input agree on these. */
export const LAYOUT = {
  hud: { height: 64 },
  board: { x: 952, y: 76, width: 312, headerHeight: 34, ticketHeight: 112, gap: 10 },
  grill: { x: 60, y: 96, width: 300, height: 168 },
  chef: { x: 428, y: 132 },
  plate: { cx: 560, cy: 424, rx: 200, ry: 48 },
  serve: { x: 800, y: 352, width: 132, height: 64 },
  trash: { x: 800, y: 432, width: 132, height: 44 },
  bins: { y: 548, height: 132, width: 132, gap: 12 },
  hint: { y: 700 },
};

/** The rectangle of the ingredient bin at `index` (0 to 5), centred as a row on the counter. */
export function binRect(index) {
  const { bins } = LAYOUT;
  const total = INGREDIENTS.length * bins.width + (INGREDIENTS.length - 1) * bins.gap;
  const x0 = (FIELD.width - total) / 2;
  return { x: x0 + index * (bins.width + bins.gap), y: bins.y, width: bins.width, height: bins.height };
}

/** The rectangle of the order ticket at `index` (0 to 2) on the order board. */
export function ticketRect(index) {
  const { board } = LAYOUT;
  return {
    x: board.x,
    y: board.y + board.headerHeight + index * (board.ticketHeight + board.gap),
    width: board.width,
    height: board.ticketHeight,
  };
}
