// Small line icons drawn straight onto a canvas, sized to the text they sit beside.

export function calendarIcon(ctx, x, y, size, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.085);
  const r = size * 0.15;
  const top = y + size * 0.14, h = size * 0.86;
  ctx.beginPath();
  ctx.moveTo(x + r, top);
  ctx.arcTo(x + size, top, x + size, top + h, r);
  ctx.arcTo(x + size, top + h, x, top + h, r);
  ctx.arcTo(x, top + h, x, top, r);
  ctx.arcTo(x, top, x + size, top, r);
  ctx.closePath();
  ctx.stroke();
  ctx.fillRect(x, top, size, size * 0.23);
  ctx.fillRect(x + size * 0.24, y, size * 0.12, size * 0.24);
  ctx.fillRect(x + size * 0.66, y, size * 0.12, size * 0.24);
}

export function pinIcon(ctx, x, y, size, colour) {
  const r = size * 0.33, cx = x + size / 2, cy = y + r + size * 0.08;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 0.2);   // the head, left open at the bottom
  ctx.lineTo(cx, y + size);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
}
