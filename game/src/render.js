// Drawing only: the kitchen's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop colour.
// Everything is drawn with canvas shapes and text: no images, no network, no fonts to load.

import { FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, SHIFT, binRect, ticketRect } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function ingredientById(id) {
  return INGREDIENTS.find((ingredient) => ingredient.id === id) || INGREDIENTS[0];
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || 400}-${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || 400} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** A window client point in logical playfield coordinates, or null when outside the field. */
  function toLogical(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    const x = (clientX * ratio - view.x) / view.scale;
    const y = (clientY * ratio - view.y) / view.scale;
    if (x < 0 || x > FIELD.width || y < 0 || y > FIELD.height) return null;
    return { x, y };
  }

  /** One ingredient drawn as a little picture, centred at (x, y) with radius r. */
  function drawIngredientIcon(id, x, y, r) {
    const ingredient = ingredientById(id);
    context.save();
    context.translate(x, y);
    if (id === 'bun') {
      context.fillStyle = ingredient.color;
      context.beginPath();
      context.arc(0, r * 0.2, r, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = ingredient.dark;
      context.fillRect(-r, r * 0.2 - 2, r * 2, 4);
      context.fillStyle = '#fff3d0';
      for (const [dx, dy] of [[-r * 0.4, -r * 0.45], [0, -r * 0.6], [r * 0.4, -r * 0.45]]) {
        context.beginPath();
        context.ellipse(dx, dy, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'patty') {
      context.fillStyle = ingredient.dark;
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = ingredient.color;
      context.beginPath();
      context.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = ingredient.dark;
      context.lineWidth = 2;
      for (const angle of [0.5, 1.8, 3.1, 4.4, 5.6]) {
        context.beginPath();
        context.moveTo(Math.cos(angle) * r * 0.3, Math.sin(angle) * r * 0.3);
        context.lineTo(Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.7);
        context.stroke();
      }
    } else if (id === 'lettuce') {
      context.fillStyle = ingredient.color;
      context.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        const next = ((i + 1) / 8) * Math.PI * 2;
        const mx = Math.cos((angle + next) / 2) * r * 1.15;
        const my = Math.sin((angle + next) / 2) * r * 1.15;
        if (i === 0) context.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        context.quadraticCurveTo(mx, my, Math.cos(next) * r, Math.sin(next) * r);
      }
      context.closePath();
      context.fill();
      context.fillStyle = ingredient.dark;
      context.beginPath();
      context.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'tomato') {
      context.fillStyle = ingredient.color;
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f4705f';
      context.beginPath();
      context.arc(0, 0, r * 0.68, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = ingredient.dark;
      context.beginPath();
      context.arc(0, -r * 0.55, r * 0.16, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'cheese') {
      context.fillStyle = ingredient.color;
      context.save();
      context.rotate(Math.PI / 4);
      context.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      context.restore();
      context.fillStyle = ingredient.dark;
      for (const [dx, dy] of [[-r * 0.35, r * 0.1], [r * 0.3, -r * 0.3], [r * 0.1, r * 0.4]]) {
        context.beginPath();
        context.arc(dx, dy, r * 0.13, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      context.fillStyle = ingredient.color;
      context.beginPath();
      context.moveTo(0, -r);
      context.quadraticCurveTo(r * 0.85, r * 0.1, r * 0.55, r * 0.75);
      context.quadraticCurveTo(0, r * 1.05, -r * 0.55, r * 0.75);
      context.quadraticCurveTo(-r * 0.85, r * 0.1, 0, -r);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.55)';
      context.beginPath();
      context.arc(-r * 0.28, -r * 0.1, r * 0.2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawHeart(x, y, size, color) {
    context.save();
    context.translate(x, y);
    context.scale(size / 20, size / 20);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, 6);
    context.bezierCurveTo(-11, -4, -6, -12, 0, -6);
    context.bezierCurveTo(6, -12, 11, -4, 0, 6);
    context.closePath();
    context.fill();
    context.restore();
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
  }

  function drawHud(state, best) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, LAYOUT.hud.height);
    text('SIZZLE & SERVE', 24, 42, 30, PALETTE.gold, 'left', 800);
    text('SHIFT', FIELD.width / 2 - 130, 30, 15, PALETTE.muted, 'left', 700);
    const shiftText = formatClock(state.shiftLeft);
    text(shiftText, FIELD.width / 2 - 130, 56, 26, state.shiftLeft <= 10 ? PALETTE.red : PALETTE.text, 'left', 800);
    const barWidth = 200;
    const barX = FIELD.width / 2 + 10;
    context.fillStyle = '#3a2a1a';
    roundRect(context, barX, 34, barWidth, 10, 5);
    context.fill();
    context.fillStyle = state.shiftLeft <= 10 ? PALETTE.red : PALETTE.gold;
    roundRect(context, barX, 34, barWidth * Math.max(0, state.shiftLeft / SHIFT.seconds), 10, 5);
    context.fill();
    text(`SCORE ${state.score}`, 1000, 42, 26, PALETTE.text, 'right', 800);
    for (let i = 0; i < 3; i += 1) {
      drawHeart(1030 + i * 34, 34, 22, i < state.lives ? PALETTE.red : '#4a3a2a');
    }
    text(`LV ${state.level}`, 1256, 42, 24, PALETTE.gold, 'right', 800);
    if (state.combo >= 2) {
      text(`COMBO x${(1 + 0.25 * (state.combo - 1)).toFixed(2).replace(/\.?0+$/, '')}`, 1256, 62, 14, PALETTE.green, 'right', 700);
    }
  }

  function drawKitchen(state) {
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, LAYOUT.hud.height, FIELD.width, 476);
    context.fillStyle = PALETTE.wallTrim;
    for (let x = 0; x < FIELD.width; x += 96) context.fillRect(x, LAYOUT.hud.height, 2, 476);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 700, FIELD.width, 20);
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, 540, FIELD.width, 160);
    context.fillStyle = PALETTE.counterEdge;
    context.fillRect(0, 540, FIELD.width, 10);

    // A sunset window over the prep table.
    const win = { x: 680, y: 84, width: 260, height: 110 };
    context.fillStyle = '#2a1a0e';
    roundRect(context, win.x - 6, win.y - 6, win.width + 12, win.height + 12, 8);
    context.fill();
    const gradient = context.createLinearGradient(0, win.y, 0, win.y + win.height);
    gradient.addColorStop(0, '#ff9d45');
    gradient.addColorStop(0.6, '#ff6b35');
    gradient.addColorStop(1, '#c94b7c');
    context.fillStyle = gradient;
    context.fillRect(win.x, win.y, win.width, win.height);
    context.fillStyle = '#ffd166';
    context.beginPath();
    context.arc(win.x + win.width / 2, win.y + win.height - 18, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#7a4a2e';
    context.fillRect(win.x + win.width / 2 - 3, win.y, 6, win.height);
    context.fillRect(win.x, win.y + win.height / 2 - 3, win.width, 6);

    // A shelf with jars above the prep table.
    context.fillStyle = '#6b4a2e';
    context.fillRect(500, 150, 160, 12);
    const jarColors = ['#e23b2e', '#69b34c', '#f7c948'];
    for (let i = 0; i < 3; i += 1) {
      const jx = 508 + i * 54;
      context.fillStyle = jarColors[i];
      roundRect(context, jx, 108, 44, 42, 6);
      context.fill();
      context.fillStyle = '#d9c9a8';
      context.fillRect(jx + 8, 100, 28, 10);
    }

    // The grill, with two patties sizzling and steam rising.
    const grill = LAYOUT.grill;
    context.fillStyle = '#1c1a18';
    roundRect(context, grill.x, grill.y, grill.width, grill.height, 10);
    context.fill();
    context.fillStyle = '#3a3632';
    roundRect(context, grill.x + 10, grill.y + 10, grill.width - 20, grill.height - 20, 8);
    context.fill();
    for (const [bx, by] of [[grill.x + 80, grill.y + 84], [grill.x + 220, grill.y + 84]]) {
      context.fillStyle = '#141210';
      context.beginPath();
      context.arc(bx, by, 52, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#57504a';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(bx, by, 52, 0, Math.PI * 2);
      context.stroke();
      drawIngredientIcon('patty', bx, by, 34);
      const steam = (state.elapsed * 0.7 + bx) % 1;
      context.fillStyle = `rgba(255,255,255,${0.35 * (1 - steam)})`;
      context.beginPath();
      context.arc(bx + Math.sin(state.elapsed * 2 + bx) * 8, by - 46 - steam * 34, 10 + steam * 8, 0, Math.PI * 2);
      context.fill();
    }
    text('GRILL', grill.x + 16, grill.y + 30, 15, PALETTE.muted, 'left', 700);

    // The chef, watching the plate.
    const chef = LAYOUT.chef;
    context.fillStyle = '#f8f4ec';
    roundRect(context, chef.x - 34, chef.y + 62, 68, 86, 12);
    context.fill();
    context.fillStyle = '#e23b2e';
    context.fillRect(chef.x - 34, chef.y + 96, 68, 10);
    context.fillStyle = '#f0c8a0';
    context.beginPath();
    context.arc(chef.x, chef.y + 34, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f8f4ec';
    roundRect(context, chef.x - 30, chef.y - 6, 60, 26, 12);
    context.fill();
    context.beginPath();
    context.arc(chef.x - 22, chef.y - 8, 14, 0, Math.PI * 2);
    context.arc(chef.x, chef.y - 14, 16, 0, Math.PI * 2);
    context.arc(chef.x + 22, chef.y - 8, 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#241a12';
    context.beginPath();
    context.arc(chef.x - 11, chef.y + 30, 3, 0, Math.PI * 2);
    context.arc(chef.x + 11, chef.y + 30, 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#241a12';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(chef.x, chef.y + 40, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
    context.strokeStyle = '#f0c8a0';
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(chef.x + 30, chef.y + 84);
    context.lineTo(chef.x + 78, chef.y + 108);
    context.stroke();

    // The prep table under the plate.
    context.fillStyle = '#b07a45';
    roundRect(context, 380, 396, 560, 88, 10);
    context.fill();
    context.fillStyle = '#8a5a33';
    context.fillRect(380, 396, 560, 8);
  }

  function drawTicket(order, index, selected) {
    const rect = ticketRect(index);
    context.fillStyle = PALETTE.ticket;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.fill();
    if (selected) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 4;
      roundRect(context, rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, 8);
      context.stroke();
    }
    const urgent = order.timeLeft <= 8;
    text(order.dish, rect.x + 14, rect.y + 28, 22, '#241a12', 'left', 800);
    text(urgent ? `HURRY ${Math.ceil(order.timeLeft)}s` : `${Math.ceil(order.timeLeft)}s`, rect.x + rect.width - 14, rect.y + 28, 18, urgent ? PALETTE.red : '#6b4a2e', 'right', 800);
    const total = order.recipe.length;
    const iconGap = 56;
    const startX = rect.x + rect.width / 2 - ((total - 1) * iconGap) / 2;
    order.recipe.forEach((id, i) => {
      const cx = startX + i * iconGap;
      drawIngredientIcon(id, cx, rect.y + 58, 15);
      text(ingredientById(id).name, cx, rect.y + 82, 10, '#6b4a2e', 'center', 600);
    });
    const fraction = Math.max(0, order.timeLeft / order.timeMax);
    const barWidth = rect.width - 28 - (selected ? 100 : 0);
    context.fillStyle = '#e8dcc0';
    roundRect(context, rect.x + 14, rect.y + 94, barWidth, 7, 3);
    context.fill();
    context.fillStyle = fraction > 0.5 ? PALETTE.green : fraction > 0.25 ? '#f2a541' : PALETTE.red;
    roundRect(context, rect.x + 14, rect.y + 94, barWidth * fraction, 7, 3);
    context.fill();
    if (selected) {
      context.fillStyle = PALETTE.gold;
      roundRect(context, rect.x + rect.width - 92, rect.y + 86, 82, 20, 10);
      context.fill();
      text('COOKING', rect.x + rect.width - 51, rect.y + 101, 12, '#5a3d00', 'center', 800);
    }
  }

  function drawBoard(state) {
    const { board } = LAYOUT;
    context.fillStyle = PALETTE.board;
    roundRect(context, board.x - 8, board.y - 8, board.width + 16, 3 * (board.ticketHeight + board.gap) + board.headerHeight + 36, 12);
    context.fill();
    text('ORDER BOARD', board.x + 6, board.y + 24, 20, '#5a3d00', 'left', 800);
    text(`${state.orders.length} ticket${state.orders.length === 1 ? '' : 's'}`, board.x + board.width - 6, board.y + 24, 14, '#8a6a3a', 'right', 600);
    state.orders.forEach((order, index) => {
      drawTicket(order, index, order.id === state.selectedId);
    });
    if (state.orders.length === 0) {
      text('No orders yet —', board.x + board.width / 2, board.y + 130, 16, '#8a6a3a', 'center', 600);
      text('the rush is coming!', board.x + board.width / 2, board.y + 154, 16, '#8a6a3a', 'center', 600);
    }
    const statsY = board.y + board.headerHeight + 3 * (board.ticketHeight + board.gap) + 22;
    text(`Served ${state.served}   Missed ${state.missed}   Best combo x${state.bestCombo}`, board.x + board.width / 2, statsY, 15, '#5a3d00', 'center', 600);
  }

  function drawPlateLayer(id, cx, topY, width) {
    if (id === 'bun') {
      context.fillStyle = ingredientById(id).color;
      context.beginPath();
      context.ellipse(cx, topY + 14, width / 2, 26, 0, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff3d0';
      for (const dx of [-width * 0.25, 0, width * 0.25]) {
        context.beginPath();
        context.ellipse(cx + dx, topY + 2, 5, 3, 0, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'lettuce') {
      context.fillStyle = ingredientById(id).color;
      context.beginPath();
      context.moveTo(cx - width / 2, topY + 14);
      for (let x = -width / 2; x < width / 2; x += 20) {
        context.quadraticCurveTo(cx + x + 10, topY - 4, cx + x + 20, topY + 14);
      }
      context.lineTo(cx + width / 2, topY + 14);
      context.closePath();
      context.fill();
    } else if (id === 'tomato') {
      context.fillStyle = ingredientById(id).color;
      context.beginPath();
      context.ellipse(cx, topY + 7, width / 2, 7, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f4705f';
      context.beginPath();
      context.ellipse(cx, topY + 7, width / 2 - 14, 4, 0, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'cheese') {
      context.fillStyle = ingredientById(id).color;
      context.beginPath();
      context.moveTo(cx - width / 2, topY);
      context.lineTo(cx + width / 2, topY);
      context.lineTo(cx + width / 2 - 16, topY + 14);
      context.lineTo(cx - width / 2 + 16, topY + 14);
      context.closePath();
      context.fill();
    } else if (id === 'sauce') {
      context.strokeStyle = ingredientById(id).color;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(cx - width / 2 + 10, topY + 7);
      for (let x = -width / 2 + 10; x < width / 2 - 10; x += 24) {
        context.lineTo(cx + x + 12, topY + 1);
        context.lineTo(cx + x + 24, topY + 13);
      }
      context.stroke();
    } else {
      context.fillStyle = ingredientById(id).color;
      roundRect(context, cx - width / 2, topY, width, 14, 7);
      context.fill();
    }
  }

  function drawPlate(state, matching) {
    const { plate } = LAYOUT;
    const ready = matching !== null;
    if (ready) {
      const glow = 0.55 + 0.3 * Math.sin(state.elapsed * 6);
      context.save();
      context.shadowColor = `rgba(242,201,76,${glow})`;
      context.shadowBlur = 34;
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.ellipse(plate.cx, plate.cy, plate.rx, plate.ry, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.ellipse(plate.cx, plate.cy, plate.rx, plate.ry, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = PALETTE.plateRim;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(plate.cx, plate.cy, plate.rx - 8, plate.ry - 7, 0, 0, Math.PI * 2);
    context.stroke();
    state.plate.forEach((id, index) => {
      const topY = plate.cy - 22 - index * 15;
      drawPlateLayer(id, plate.cx, topY, 300 - index * 8);
    });
    if (state.plate.length === 0) {
      text('Empty plate — add ingredients', plate.cx, plate.cy + 6, 16, '#8a6a3a', 'center', 600);
    }
    const names = state.plate.map((id) => ingredientById(id).name).join(' + ');
    text(names === '' ? ' ' : names, plate.cx, plate.cy + 66, 16, '#f8f1e4', 'center', 600);
    if (ready) {
      text(`READY: ${matching.dish} — SERVE IT!`, plate.cx, plate.cy - 108, 24, PALETTE.gold, 'center', 800);
    }
  }

  function drawServeButton(state, matching) {
    const { serve, trash } = LAYOUT;
    const ready = matching !== null;
    const pulse = ready ? 1 + 0.04 * Math.sin(state.elapsed * 6) : 1;
    const width = serve.width * pulse;
    const x = serve.x + (serve.width - width) / 2;
    context.fillStyle = ready ? PALETTE.button : PALETTE.buttonDisabled;
    roundRect(context, x, serve.y, width, serve.height, 12);
    context.fill();
    if (ready) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 3;
      roundRect(context, x + 2, serve.y + 2, width - 4, serve.height - 4, 10);
      context.stroke();
    }
    text('SERVE', x + width / 2, serve.y + 30, 26, ready ? PALETTE.buttonText : '#d9d0c0', 'center', 800);
    text(ready ? 'Enter' : 'match a ticket', x + width / 2, serve.y + 52, 14, ready ? PALETTE.buttonText : '#b8ac9a', 'center', 600);
    context.fillStyle = '#5a5148';
    roundRect(context, trash.x, trash.y, trash.width, trash.height, 10);
    context.fill();
    context.fillStyle = '#d9d0c0';
    context.fillRect(trash.x + 16, trash.y + 12, 18, 3);
    context.fillRect(trash.x + 19, trash.y + 15, 12, 20);
    text('CLEAR  (C)', trash.x + 44, trash.y + 30, 16, '#f8f1e4', 'left', 700);
  }

  function drawBins() {
    INGREDIENTS.forEach((ingredient, index) => {
      const rect = binRect(index);
      context.fillStyle = '#6b3d1e';
      roundRect(context, rect.x, rect.y, rect.width, rect.height, 12);
      context.fill();
      context.fillStyle = '#7a4a26';
      roundRect(context, rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 10);
      context.fill();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(rect.x + 20, rect.y + 20, 13, 0, Math.PI * 2);
      context.fill();
      text(ingredient.key, rect.x + 20, rect.y + 25, 16, '#5a3d00', 'center', 800);
      drawIngredientIcon(ingredient.id, rect.x + rect.width / 2, rect.y + 58, 30);
      text(ingredient.name, rect.x + rect.width / 2, rect.y + 106, 18, PALETTE.text, 'center', 700);
    });
    text('1–6 add ingredient  ·  Enter serve  ·  ↑↓ pick ticket  ·  Backspace undo  ·  C clear  ·  P pause  ·  M sound', FIELD.width / 2, LAYOUT.hint.y + 12, 14, PALETTE.muted, 'center', 600);
  }

  function drawPanel(x, y, width, height) {
    context.fillStyle = 'rgba(20,14,8,0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = '#2e2114';
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    roundRect(context, x + 2, y + 2, width - 4, height - 4, 14);
    context.stroke();
  }

  function drawTitle(state, best) {
    const cx = FIELD.width / 2;
    drawPanel(300, 120, 680, 480);
    text('SIZZLE & SERVE', cx, 210, 56, PALETTE.gold, 'center', 800);
    text('A sunset food-truck kitchen', cx, 250, 22, PALETTE.text, 'center', 600);
    text('Tickets roll in on the order board — build each dish', cx, 320, 19, PALETTE.muted, 'center', 400);
    text('on the plate before its clock runs out, then serve it.', cx, 348, 19, PALETTE.muted, 'center', 400);
    text('Click the bins or press 1–6 to add ingredients.', cx, 392, 19, PALETTE.muted, 'center', 400);
    text('A missed ticket costs a life. Three lives a shift.', cx, 420, 19, PALETTE.muted, 'center', 400);
    if (best > 0) text(`Best score ${best}`, cx, 470, 20, PALETTE.gold, 'center', 700);
    const blink = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    context.globalAlpha = blink;
    text('PRESS SPACE OR CLICK TO START', cx, 540, 24, PALETTE.text, 'center', 800);
    context.globalAlpha = 1;
  }

  function drawOver(state, best) {
    const cx = FIELD.width / 2;
    drawPanel(340, 150, 600, 420);
    text(state.overReason === 'out of lives' ? 'OUT OF LIVES!' : 'SHIFT COMPLETE!', cx, 240, 48, PALETTE.gold, 'center', 800);
    text(`Score ${state.score}`, cx, 310, 34, PALETTE.text, 'center', 800);
    text(`Dishes served ${state.served}   ·   Missed ${state.missed}`, cx, 360, 20, PALETTE.muted, 'center', 600);
    text(`Best combo x${state.bestCombo}   ·   Best score ${best}`, cx, 392, 20, PALETTE.muted, 'center', 600);
    const blink = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    context.globalAlpha = blink;
    text('PRESS SPACE TO COOK AGAIN', cx, 500, 22, PALETTE.text, 'center', 800);
    context.globalAlpha = 1;
  }

  function drawPaused() {
    context.fillStyle = 'rgba(20,14,8,0.66)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10, 52, PALETTE.text, 'center', 800);
    text('Press P to get back to the grill', FIELD.width / 2, FIELD.height / 2 + 34, 20, PALETTE.muted, 'center', 600);
  }

  function draw(state, kitchen, screen, best, muted) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state);
    drawBoard(state);
    const matching = kitchen.matchingOrder();
    drawPlate(state, matching);
    drawServeButton(state, matching);
    drawBins();
    drawHud(state, best);
    if (muted) text('SOUND OFF (M)', FIELD.width - 24, LAYOUT.hint.y + 12, 14, PALETTE.muted, 'right', 700);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw, toLogical };
}
