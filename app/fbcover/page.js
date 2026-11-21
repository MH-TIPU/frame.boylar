'use client';

import { useEffect, useRef, useState } from 'react';
import { Galada, Hind_Siliguri } from 'next/font/google';
import FrameForm from '../../components/FrameForm';
import { loadImage, pickImage } from '../../lib/image';

// Self-hosted so the Bengali on the canvas looks the same on every device.
const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '700'], display: 'swap' });
const galada = Galada({ subsets: ['bengali', 'latin'], weight: '400', display: 'swap' });
const FONT = hind.style.fontFamily;
const SCRIPT = galada.style.fontFamily;   // the calligraphic face, used for the title only

// Facebook cover canvas, in its own pixel space (2x the 820x312 it is shown at).
const W = 1640, H = 624;
const BAND = 98;                                      // cream partner-logo strip at the top
const TITLE = { y: 155, size: 58, max: 1180 };        // the line every banner shares
const CONTENT = { y: 196, h: 336 };                   // everything else, above the bottom wave
const SLOT = { x: 56, y: 240, w: 280, h: 248 };       // the entrepreneur's own logo
const TEXT = { x: 376, w: 594 };
const STALL = { x: 1029, y: 196, w: 555, h: 336 };    // the stall, same shape as booth.svg
const FACIA = 74;                                     // signboard strip laid over an uploaded photo
const WAVE = { yellow: 536, green: 560 };             // the dipped foot, and where content must stop
const BODY = { size: 32, line: 43 };                  // who, and where to find them
const META = { size: 26, line: 36 };                  // when and where the fair is
const NOTE = { size: 27, line: 36 };                  // the entrepreneur's own message
const FAIR = 'জাতীয় এসএমই পণ্য মেলা ২০২৬';
const DATES = '২২ থেকে ২৮ নভেম্বর ২০২৬';
const VENUE = 'স্থান: বাংলাদেশ-চীন মৈত্রী সম্মেলন কেন্দ্র, আগারগাঁও, ঢাকা';
const WELCOME = 'আপনাদের আমন্ত্রণ রইল আমাদের স্টলে';

const CREAM = '#fffeeb', DARK = '#005c4b', GREEN = '#1ea851', YELLOW = '#ffe600', INK = '#14362c';

// The blank signboard on the standard stall, as fractions of that drawing's frame.
const BOOTH_FACIA = { x: 50 / 684, y: 36 / 414, w: 422 / 684, h: 74 / 414 };

const FIXED = {
  booth: '/frames/booth.svg',
  mela: '/logos/mela2026.png',
  bdosn: '/logos/bdosn.png',
};

const font = (weight, size) => `${weight} ${size}px ${FONT}`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws an image at a fixed height and reports the width it took, for laying out a logo row.
function byHeight(ctx, img, x, midY, h) {
  if (!img) return 0;
  const w = img.width * h / img.height;
  ctx.drawImage(img, x, midY - h / 2, w, h);
  return w;
}

function calendarIcon(ctx, x, y, size, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2.2;
  roundRect(ctx, x, y + size * 0.14, size, size * 0.86, 4);
  ctx.stroke();
  ctx.fillRect(x, y + size * 0.14, size, 6);
  ctx.fillRect(x + size * 0.24, y, 3, size * 0.24);
  ctx.fillRect(x + size * 0.68, y, 3, size * 0.24);
}

function pinIcon(ctx, x, y, size, colour) {
  const r = size * 0.33, cx = x + size / 2, cy = y + r + 2;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 0.2);   // the round head, left open at the bottom
  ctx.lineTo(cx, y + size);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

// One block of fair detail: an icon, then text wrapped beside it.
function detail(ctx, icon, lines, x, top, colour) {
  icon(ctx, x, top + 3, META.size, GREEN);
  drawLines(ctx, lines, x + META.size + 14, top + META.size * 0.82, META.size, META.line, colour);
  return lines.length * META.line;
}

function placeholder(ctx, box, label) {
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = '#b9bca6';
  ctx.lineWidth = 3;
  roundRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#9aa08c';
  ctx.font = font(400, 26);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2);
  ctx.restore();
}

// Brands a stall's signboard: logo and name to the left, stall number on a plate at the
// right. `dark` is for the strip laid over someone's own photo, light for the drawn stall.
function facia(ctx, box, { logo, name, number }, dark) {
  const mid = box.y + box.h / 2;
  let right = box.x + box.w - 12;

  if (number) {
    ctx.font = font(700, 34);
    const plateW = Math.max(78, ctx.measureText(number).width + 30);
    const plateH = Math.min(box.h - 14, 58);
    const plateX = right - plateW, plateY = mid - plateH / 2;
    ctx.fillStyle = dark ? YELLOW : DARK;
    roundRect(ctx, plateX, plateY, plateW, plateH, 8);
    ctx.fill();
    ctx.fillStyle = dark ? INK : YELLOW;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, plateX + plateW / 2, mid + 2);
    right = plateX - 16;
  }

  let x = box.x + 14;
  if (logo) {
    const h = Math.min(box.h - 18, 50);
    const w = logo.width * h / logo.height;
    const k = Math.min(1, (name ? (right - x) * 0.4 : right - x) / w);
    ctx.drawImage(logo, x, mid - h * k / 2, w * k, h * k);
    x += w * k + 14;
  }
  if (name) {
    let size = 30;
    ctx.font = font(700, size);
    const width = ctx.measureText(name).width;
    if (width > right - x) size = Math.max(13, Math.floor(size * (right - x) / width));
    ctx.font = font(700, size);
    ctx.fillStyle = dark ? CREAM : INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, mid + 1);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Lays out a sentence made of styled runs, wrapping on spaces.
function layout(ctx, runs, maxW, size) {
  const lines = [];
  let line = [], width = 0;
  for (const run of runs) {
    for (const word of String(run.text).split(/\s+/).filter(Boolean)) {
      ctx.font = font(run.bold ? 700 : 400, size);
      const w = ctx.measureText(word).width;
      const space = line.length ? ctx.measureText(' ').width : 0;
      if (line.length && width + space + w > maxW) {
        lines.push(line);
        line = []; width = 0;
      }
      const gap = line.length ? space : 0;
      line.push({ ...run, word, w, gap });
      width += gap + w;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawLines(ctx, lines, x, baseline, size, lineH, colour) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const y = baseline + i * lineH;
    let cx = x;
    for (const item of line) {
      cx += item.gap;
      ctx.font = font(item.bold ? 700 : 400, size);
      if (item.mark) {
        ctx.fillStyle = YELLOW;
        roundRect(ctx, cx - 9, y - size * 0.82, item.w + 18, size * 1.12, 7);
        ctx.fill();
      }
      ctx.fillStyle = item.mark ? INK : colour;
      ctx.fillText(item.word, cx, y);
      cx += item.w;
    }
  });
}

export default function Page() {
  const canvas = useRef(null);
  const logoInput = useRef(null);
  const stallInput = useRef(null);
  const s = useRef({ logo: null, stall: null, fixed: {}, zoom: 1, ox: 0, oy: 0, last: null }).current;
  const [hasLogo, setHasLogo] = useState(false);
  const [hasStall, setHasStall] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [business, setBusiness] = useState('');
  const [stallNo, setStallNo] = useState('');
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);   // bumped when the fixed logos and font are ready

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');

    const sky = ctx.createLinearGradient(0, BAND, 0, H);
    sky.addColorStop(0, '#f5f3e1');
    sky.addColorStop(1, '#e5e2c7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // the dipped yellow/green foot, echoing the smefair frame
    for (const [colour, top] of [[YELLOW, WAVE.yellow], [DARK, WAVE.green]]) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.quadraticCurveTo(W / 2, top + 76, W, top);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
    }

    // cream band carrying the fair's own lockup: its logo, then its name
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, BAND);
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, BAND, W, 5);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, BAND + 5, W, 3);
    const mid = BAND / 2, mela = s.fixed.mela;
    ctx.font = font(700, 36);
    const fairW = ctx.measureText(FAIR).width;
    const melaW = mela ? mela.width * 70 / mela.height : 0;
    const lockup = (W - melaW - 26 - fairW) / 2;
    byHeight(ctx, mela, lockup, mid, 70);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK;
    ctx.fillText(FAIR, lockup + melaW + 26, mid + 1);

    // the one line every banner shares, set in the calligraphic face as the title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = TITLE.size;
    ctx.font = `400 ${size}px ${SCRIPT}`;
    let titleW = ctx.measureText(WELCOME).width;
    if (titleW > TITLE.max) {
      size = Math.floor(size * TITLE.max / titleW);
      ctx.font = `400 ${size}px ${SCRIPT}`;
      titleW = ctx.measureText(WELCOME).width;
    }
    ctx.fillStyle = DARK;
    ctx.fillText(WELCOME, W / 2, TITLE.y);
    ctx.save();                       // a rule and a diamond either side of it
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = GREEN;
    ctx.fillStyle = GREEN;
    ctx.lineWidth = 2.5;
    for (const dir of [-1, 1]) {
      const from = W / 2 + dir * (titleW / 2 + 30);
      ctx.beginPath();
      ctx.moveTo(from, TITLE.y);
      ctx.lineTo(from + dir * 64, TITLE.y);
      ctx.stroke();
      const tip = from + dir * 78;
      ctx.beginPath();
      ctx.moveTo(tip, TITLE.y - 5);
      ctx.lineTo(tip + 5, TITLE.y);
      ctx.lineTo(tip, TITLE.y + 5);
      ctx.lineTo(tip - 5, TITLE.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // under the title: the logo, then which fair, who, where and their own words
    const brand = { logo: s.logo, name: business.trim(), number: stallNo.trim() };
    if (s.logo) {
      const k = Math.min(SLOT.w / s.logo.width, SLOT.h / s.logo.height);
      ctx.drawImage(s.logo, SLOT.x, SLOT.y + (SLOT.h - s.logo.height * k) / 2, s.logo.width * k, s.logo.height * k);
    } else {
      placeholder(ctx, SLOT, 'আপনার লোগো');
    }

    const body = [
      { text: brand.name || 'আপনার প্রতিষ্ঠানের নাম', bold: true },
      { text: brand.number ? 'থাকছে এবারে মেলায় — স্টল নম্বর' : 'থাকছে এবারে মেলায়।' },
    ];
    if (brand.number) body.push({ text: brand.number, bold: true, mark: true });
    const lines = layout(ctx, body, TEXT.w, BODY.size);
    const metaW = TEXT.w - META.size - 14;
    const dates = layout(ctx, [{ text: DATES }], metaW, META.size);
    const venue = layout(ctx, [{ text: VENUE }], metaW, META.size);
    const note = message.trim() ? layout(ctx, [{ text: message.trim() }], TEXT.w - 24, NOTE.size) : null;
    const stackH = lines.length * BODY.line + 20 + (dates.length + venue.length) * META.line + 8
      + (note ? 22 + note.length * NOTE.line : 0);
    let y = CONTENT.y + (CONTENT.h - stackH) / 2;

    drawLines(ctx, lines, TEXT.x, y + BODY.size * 0.8, BODY.size, BODY.line, INK);
    y += lines.length * BODY.line + 20;

    y += detail(ctx, calendarIcon, dates, TEXT.x, y, '#2f4a40') + 8;
    y += detail(ctx, pinIcon, venue, TEXT.x, y, '#2f4a40');

    if (note) {
      y += 22;
      ctx.fillStyle = GREEN;
      ctx.fillRect(TEXT.x, y, 5, note.length * NOTE.line - 8);
      drawLines(ctx, note, TEXT.x + 24, y + NOTE.size * 0.8, NOTE.size, NOTE.line, '#3c5a4f');
    }

    // the stall: the entrepreneur's own photo if they have one, otherwise the standard
    // stall drawing. The number goes on a facia either way.
    const shot = s.stall || s.fixed.booth;
    ctx.save();
    roundRect(ctx, STALL.x, STALL.y, STALL.w, STALL.h, 18);
    ctx.clip();
    ctx.fillStyle = '#2b323b';
    ctx.fillRect(STALL.x, STALL.y, STALL.w, STALL.h);
    if (shot) {
      const k = Math.max(STALL.w / shot.width, STALL.h / shot.height) * (s.stall ? s.zoom : 1);
      const w = shot.width * k, h = shot.height * k;
      if (s.stall) {
        s.ox = Math.max(-(w - STALL.w) / 2, Math.min((w - STALL.w) / 2, s.ox));
        s.oy = Math.max(-(h - STALL.h) / 2, Math.min((h - STALL.h) / 2, s.oy));
      }
      const ox = s.stall ? s.ox : 0, oy = s.stall ? s.oy : 0;
      ctx.drawImage(shot, STALL.x + (STALL.w - w) / 2 + ox, STALL.y + (STALL.h - h) / 2 + oy, w, h);
    }
    if (s.stall) {
      // their own photo: a signboard strip of ours across the top
      if (brand.name || brand.number) {
        ctx.fillStyle = DARK;
        ctx.fillRect(STALL.x, STALL.y, STALL.w, FACIA);
        ctx.fillStyle = YELLOW;
        ctx.fillRect(STALL.x, STALL.y + FACIA - 5, STALL.w, 5);
        facia(ctx, { x: STALL.x, y: STALL.y, w: STALL.w, h: FACIA - 5 }, brand, true);
      }
    } else {
      // the standard stall: branded on its own blank signboard
      facia(ctx, {
        x: STALL.x + BOOTH_FACIA.x * STALL.w,
        y: STALL.y + BOOTH_FACIA.y * STALL.h,
        w: BOOTH_FACIA.w * STALL.w,
        h: BOOTH_FACIA.h * STALL.h,
      }, brand, false);
    }
    ctx.restore();
    roundRect(ctx, STALL.x, STALL.y, STALL.w, STALL.h, 18);
    ctx.lineWidth = 6;
    ctx.strokeStyle = CREAM;
    ctx.stroke();

    // the organiser's mark, bottom right in the foot
    const bdosn = s.fixed.bdosn;
    if (bdosn) {
      const h = 40, w = bdosn.width * h / bdosn.height;
      const plateW = w + 24, plateH = h + 16;
      const px = 1584 - plateW, py = 618 - plateH;
      ctx.fillStyle = CREAM;
      roundRect(ctx, px, py, plateW, plateH, 8);
      ctx.fill();
      ctx.drawImage(bdosn, px + 12, py + 8, w, h);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const pairs = await Promise.all(
        Object.entries(FIXED).map(async ([key, src]) => [key, await loadImage(src).catch(() => null)]),
      );
      if (!alive) return;
      s.fixed = Object.fromEntries(pairs);
      try {
        await Promise.all([
          ...[400, 700].map(w => document.fonts.load(font(w, 40))),
          document.fonts.load(`400 ${TITLE.size}px ${SCRIPT}`),
        ]);
        await document.fonts.ready;
      } catch { /* fall back to whatever the system has */ }
      if (alive) setTick(t => t + 1);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(draw);   // every render: images, text and font loading all change the canvas

  const pickLogo = e => pickImage(e, img => { s.logo = img; setHasLogo(true); }, draw);
  const clearLogo = () => { s.logo = null; logoInput.current.value = ''; setHasLogo(false); draw(); };
  const pickStall = e => pickImage(e, img => {
    Object.assign(s, { stall: img, zoom: 1, ox: 0, oy: 0 });
    setZoom(1);
    setHasStall(true);
  }, draw);
  const clearStall = () => {
    Object.assign(s, { stall: null, zoom: 1, ox: 0, oy: 0 });
    stallInput.current.value = '';
    setZoom(1);
    setHasStall(false);
    draw();
  };
  const changeZoom = e => { s.zoom = +e.target.value; setZoom(s.zoom); draw(); };

  // Drag inside the stall photo to reframe it.
  const at = e => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height, k: W / r.width };
  };
  const dragStart = e => {
    const p = at(e);
    if (!s.stall || p.x < STALL.x || p.x > STALL.x + STALL.w || p.y < STALL.y || p.y > STALL.y + STALL.h) return;
    s.last = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragMove = e => {
    if (!s.last) return;
    const k = W / e.currentTarget.clientWidth;
    s.ox += (e.clientX - s.last.x) * k;
    s.oy += (e.clientY - s.last.y) * k;
    s.last = { x: e.clientX, y: e.clientY };
    draw();
  };
  const dragEnd = () => { s.last = null; };

  return (
    <div className={hind.className}>
      <header>
        <h1>Make your stall invitation cover for Facebook</h1>
      </header>
      <main className="stack">
        <canvas
          ref={canvas} width={W} height={H} aria-label="Cover preview"
          className={hasStall ? 'movable' : undefined}
          onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
        />
        <FrameForm
          source="fbcover" fileName="sme-mela-2026-fb-cover.jpg" stepNo="৪"
          canvasRef={canvas} canDownload={hasLogo || hasStall || !!business.trim() || !!stallNo.trim()}
        >
          <div className="step">
            <label>
              <b>১. আপনার লোগো <span>Your logo</span></b>
              <input ref={logoInput} type="file" accept="image/*" onChange={pickLogo} />
            </label>
            <small>স্বচ্ছ (transparent) PNG সবচেয়ে ভালো দেখায়</small>
            {hasLogo && <button className="link" type="button" onClick={clearLogo}>লোগো সরান · Remove logo</button>}
          </div>
          <div className="step">
            <label>
              <b>২. স্টলের ছবি <span>Stall photo (optional)</span></b>
              <input ref={stallInput} type="file" accept="image/*" onChange={pickStall} />
            </label>
            {hasStall ? (
              <>
                <label className="zoom">
                  <span>জুম · Zoom</span>
                  <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={changeZoom} />
                </label>
                <small>ছবি টেনে সরান · Drag the photo to reposition</small>
                <button className="link" type="button" onClick={clearStall}>সাধারণ স্টল ব্যবহার করুন · Use the standard stall</button>
              </>
            ) : (
              <small>
                নিজের ছবি না দিলে সাধারণ স্টলের ছবি ব্যবহার হবে, স্টল নম্বর তার সাইনবোর্ডে বসবে।
                <br />
                Leave this empty and a standard stall is used, with your number on its signboard.
              </small>
            )}
          </div>
          <div className="step fields">
            <b>৩. স্টলের তথ্য <span>Stall details</span></b>
            <div className="grid">
              <label>ব্যবসার নাম · Business name
                <input value={business} maxLength={60} onChange={e => setBusiness(e.target.value)} placeholder="আপনার প্রতিষ্ঠানের নাম" />
              </label>
              <label>স্টল নম্বর · Stall number
                <input value={stallNo} maxLength={12} onChange={e => setStallNo(e.target.value)} placeholder="১২৩" />
              </label>
            </div>
            <label>কাস্টম বার্তা · Custom message (optional)
              <textarea value={message} maxLength={120} rows={2} onChange={e => setMessage(e.target.value)} placeholder="আপনার স্লোগান বা যেকোনো বার্তা" />
            </label>
          </div>
        </FrameForm>
      </main>
      <footer>Made with ♥ by <a href="https://boylar.com" target="_blank" rel="noopener">boylar.com</a></footer>
    </div>
  );
}
