'use client';

import { useEffect, useRef, useState } from 'react';
import { Galada, Hind_Siliguri } from 'next/font/google';
import FrameForm from '../../components/FrameForm';
import FrameNav from '../../components/FrameNav';
import { loadImage, pickImage } from '../../lib/image';

// Self-hosted so the Bengali on the canvas looks the same on every device.
const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['300', '400', '700'], display: 'swap' });
const galada = Galada({ subsets: ['bengali', 'latin'], weight: '400', display: 'swap' });
const FONT = hind.style.fontFamily;
const SCRIPT = galada.style.fontFamily;   // the curved face, used for the slogan

// Facebook cover canvas, in its own pixel space (2x the 820x312 it is shown at).
// SCALE renders that space onto a larger bitmap: every fixed logo is still drawn
// smaller than its source file, so this costs nothing in sharpness.
const W = 1640, H = 624, SCALE = 2;
// Facebook never shows the whole cover. The desktop page shows it at 820x312, but the phone
// app centre-crops to a much taller shape, keeps only the middle of the width, and then lays
// the page's round profile photo over the bottom centre. Measured off a live page, the phone
// keeps about the middle 56% and that photo covers the middle 44% of it from 38% height down.
// So the cover is built in three parts: a full-width band of fair detail across the top, a
// column of the exhibitor's own down the left, the stall out to the right, and the middle
// deliberately left as bare kantha, which is exactly where the profile photo lands.
const SAFE = { x: 360, w: 920 };                      // 360..1280: what a phone keeps
const CLEAR = { x: 616, w: 424 };                     // 616..1040: left empty for the profile photo
const BAND = 124;                                     // cream strip at the top: all of the fair's detail
const META_W = 350;                                   // the dates and address, set beside the fair's name
const AREA = { y: BAND + 24, h: H - BAND - 24 - 28 };  // the room left under the band
const COL = { x: SAFE.x, w: CLEAR.x - SAFE.x - 10 };  // the left column, clear of that photo
const SLOT = { x: SAFE.x, w: 240, h: 112 };           // the entrepreneur's own logo
// The stall is a photo, not words, so it is the one thing that may run under the profile
// photo: it starts above that photo's top edge and only loses a corner of itself to it.
// Its right edge stops short of 1280 so the number on its signboard is never cut in half.
const STALL = { x: 860, y: 0, w: 600, h: 363 };       // 684:414, as booth.svg
const NEED = { w: STALL.w * SCALE, h: STALL.h * SCALE };   // the photo size the slot can use
const FACIA = 60;                                     // signboard strip laid over an uploaded photo
const MARK = { right: STALL.x + STALL.w, h: 46 };     // the organiser's logo, under the stall
const SLOGAN = { size: 38, line: 50 };                // the entrepreneur's own line, set in the curved face
const BODY = { size: 34, line: 46 };                  // who they are and which stall
const META = { size: 20, line: 28 };                  // when and where the fair is
const NAME_MAX = 40;                                  // past this a name cannot sit on the facia
const FAIR = 'জাতীয় এসএমই পণ্য মেলা ২০২৬';
const DATES = '২২ থেকে ২৮ নভেম্বর ২০২৬';
const VENUE = 'স্থান: বাংলাদেশ-চীন মৈত্রী সম্মেলন কেন্দ্র, আগারগাঁও, ঢাকা';

const CREAM = '#fffeeb', DARK = '#005c4b', GREEN = '#1ea851', YELLOW = '#ffe600', INK = '#14362c';

// The blank signboard on the standard stall, as fractions of that drawing's frame.
const BOOTH_FACIA = { x: 50 / 684, y: 36 / 414, w: 422 / 684, h: 74 / 414 };

const FIXED = {
  kantha: '/frames/kantha.svg',
  booth: '/frames/booth.svg',
  mela: '/logos/mela2026.png',
  bdosn: '/logos/bdosn.png',
};

const font = (weight, size, family = FONT) => `${weight} ${size}px ${family}`;

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
  drawLines(ctx, lines, x + META.size + 12, top + META.size * 0.82, META.size, META.line, colour);
  return lines.length * META.line;
}

// Saves as the business name, with anything a filesystem would object to taken out.
function downloadName(business) {
  const name = business.trim().replace(/[\\/:*?"<>|.]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${name || 'sme-mela-2026-fb-cover'}.jpg`;
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

// Fits a business name into the space a facia leaves it: one line where it can, the
// evenest two-line break where it cannot, shrinking only as far as it has to.
function fitName(ctx, name, room, height) {
  const measure = (text, size) => {
    ctx.font = font(700, size);
    return ctx.measureText(text).width;
  };
  for (let size = 30; size >= 19; size--) {
    if (measure(name, size) <= room) return { size, lines: [name] };
  }
  const words = name.split(/\s+/).filter(Boolean);
  for (let size = 25; size >= 14 && words.length > 1; size--) {
    if (size * 2.3 > height) continue;
    let narrowest = Infinity, at = 1;
    for (let i = 1; i < words.length; i++) {
      const w = Math.max(measure(words.slice(0, i).join(' '), size), measure(words.slice(i).join(' '), size));
      if (w < narrowest) { narrowest = w; at = i; }
    }
    if (narrowest <= room) {
      return { size, lines: [words.slice(0, at).join(' '), words.slice(at).join(' ')] };
    }
  }
  return { size: 14, lines: [name] };   // one very long word: nothing left to break on
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
    const fit = fitName(ctx, name, right - x, box.h - 10);
    ctx.font = font(700, fit.size);
    ctx.fillStyle = dark ? CREAM : INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    fit.lines.forEach((line, i) => {
      ctx.fillText(line, x, mid + (i - (fit.lines.length - 1) / 2) * fit.size * 1.2 + 1);
    });
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
      ctx.font = font(run.weight || 400, size, run.family);
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
      ctx.font = font(item.weight || 400, size, item.family);
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
  const [lowRes, setLowRes] = useState(false);
  const [tick, setTick] = useState(0);   // bumped when the fixed logos and font are ready

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);   // draw in W x H units, output larger

    // nakshi kantha cloth behind everything
    if (s.fixed.kantha) {
      ctx.drawImage(s.fixed.kantha, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#f6f0dd';
      ctx.fillRect(0, 0, W, H);
    }

    // cream band, read left to right: the fair's logo, its name, then its dates and address.
    // The whole row sits inside SAFE and above the profile photo, so a phone always shows it.
    const bandMid = BAND / 2;
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, BAND);
    const titleX = SAFE.x + byHeight(ctx, s.fixed.mela, SAFE.x, bandMid, 72) + 30;
    const metaX = SAFE.x + SAFE.w - META_W;

    let titleSize = 36;                      // shrinks only as far as the room beside it demands
    ctx.font = font(700, titleSize);
    while (titleSize > 24 && ctx.measureText(FAIR).width > metaX - 30 - titleX) {
      ctx.font = font(700, --titleSize);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK;
    ctx.fillText(FAIR, titleX, bandMid);

    ctx.save();                              // a stitched rule between the name and the detail
    ctx.strokeStyle = '#b4452f';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(metaX - 22, bandMid - 32);
    ctx.lineTo(metaX - 22, bandMid + 32);
    ctx.stroke();
    ctx.restore();

    const metaW = META_W - META.size - 12;
    const dates = layout(ctx, [{ text: DATES }], metaW, META.size);
    const venue = layout(ctx, [{ text: VENUE }], metaW, META.size);
    let metaY = bandMid - ((dates.length + venue.length) * META.line + 8) / 2;
    metaY += detail(ctx, calendarIcon, dates, metaX, metaY, '#2f4a40') + 8;
    detail(ctx, pinIcon, venue, metaX, metaY, '#2f4a40');
    ctx.save();                       // a line of kantha stitch closes the band off
    ctx.strokeStyle = '#b4452f';
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([11, 9]);
    ctx.beginPath();
    ctx.moveTo(0, BAND + 3);
    ctx.lineTo(W, BAND + 3);
    ctx.stroke();
    ctx.restore();

    // left column, top to bottom: the logo, their slogan, then who they are and which stall
    const brand = { logo: s.logo, name: business.trim(), number: stallNo.trim() };
    // the logo sets how much room is left for the slogan beside it
    let logoW = SLOT.w, logoH = SLOT.h;
    if (s.logo) {
      const k = Math.min(SLOT.w / s.logo.width, SLOT.h / s.logo.height);
      logoW = s.logo.width * k;
      logoH = s.logo.height * k;
    }
    // The column is narrow and the height is fixed, so a long slogan or a long name has to
    // be allowed to set the type smaller. Set it as large as it goes and come down from there.
    // A narrow column also reads better broken where the sentence breaks than wherever it runs
    // out of room, so the name, the claim and the stall number are laid out a part at a time.
    let k = 1, slogan, lines, slog, body, stackH;
    for (;;) {
      slog = { size: Math.round(SLOGAN.size * k), line: Math.round(SLOGAN.line * k) };
      body = { size: Math.round(BODY.size * k), line: Math.round(BODY.line * k) };
      slogan = message.trim()
        ? layout(ctx, [{ text: message.trim(), family: SCRIPT }], COL.w, slog.size)
        : null;
      lines = layout(ctx, [{ text: brand.name || 'আপনার প্রতিষ্ঠানের নাম', weight: 700 }], COL.w, body.size)
        .concat(layout(ctx, [{ text: brand.number ? 'আছে এবারের মেলায়' : 'আছে এবারের মেলায়।' }], COL.w, body.size))
        .concat(brand.number
          ? layout(ctx, [{ text: 'স্টল নম্বর' }, { text: brand.number, weight: 700, mark: true }],
            COL.w - 24, body.size)   // 24 for the highlight's own padding
          : []);
      stackH = logoH + 18 + (slogan ? slogan.length * slog.line + 16 : 0) + lines.length * body.line;
      if (stackH <= AREA.h || k <= 0.62) break;
      k -= 0.04;
    }

    let y = AREA.y + Math.max(0, (AREA.h - stackH) / 2);
    if (s.logo) {
      ctx.drawImage(s.logo, SLOT.x, y, logoW, logoH);
    } else {
      placeholder(ctx, { ...SLOT, y }, 'আপনার লোগো');
    }
    y += logoH + 18;
    if (slogan) {
      drawLines(ctx, slogan, COL.x, y + slog.size * 0.8, slog.size, slog.line, DARK);
      y += slogan.length * slog.line + 16;
    }
    drawLines(ctx, lines, COL.x, y + body.size * 0.82, body.size, body.line, INK);

    // the stall: the entrepreneur's own photo if they have one, otherwise the standard
    // stall drawing. The number goes on a facia either way.
    const shot = s.stall || s.fixed.booth;
    STALL.y = AREA.y;                      // top-aligned, so its signboard clears the profile photo
    MARK.y = STALL.y + STALL.h + 18;
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

    // the organiser's mark, under the stall and clear of the foot
    const bdosn = s.fixed.bdosn;
    if (bdosn) {
      const w = bdosn.width * MARK.h / bdosn.height;
      ctx.drawImage(bdosn, MARK.right - w, MARK.y, w, MARK.h);
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
          ...[300, 400, 700].map(w => document.fonts.load(font(w, 40))),
          document.fonts.load(font(400, SLOGAN.size, SCRIPT)),
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
    setLowRes(img.width < NEED.w || img.height < NEED.h);
  }, draw);
  const clearStall = () => {
    Object.assign(s, { stall: null, zoom: 1, ox: 0, oy: 0 });
    stallInput.current.value = '';
    setZoom(1);
    setHasStall(false);
    setLowRes(false);
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
        <FrameNav current="/fbcover" />
      </header>
      <main className="stack">
        <canvas
          ref={canvas} width={W * SCALE} height={H * SCALE} aria-label="Cover preview"
          className={hasStall ? 'movable' : undefined}
          onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
        />
        <FrameForm
          source="fbcover" fileName={downloadName(business)} stepNo="৪"
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
                {lowRes && (
                  <small className="warn">
                    ছবিটি ছোট, তাই একটু ঝাপসা আসবে — অন্তত {NEED.w}×{NEED.h} পিক্সেলের ছবি দিন।
                  </small>
                )}
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
                <input
                  value={business} maxLength={NAME_MAX} placeholder="আপনার প্রতিষ্ঠানের নাম"
                  onChange={e => setBusiness(e.target.value.slice(0, NAME_MAX))}
                />
                {business.length > NAME_MAX - 14 && <small>{business.length}/{NAME_MAX}</small>}
              </label>
              <label>স্টল নম্বর · Stall number
                <input value={stallNo} maxLength={12} onChange={e => setStallNo(e.target.value)} placeholder="১২৩" />
              </label>
            </div>
            <label>স্লোগান · Slogan (optional)
              <textarea value={message} maxLength={90} rows={2} onChange={e => setMessage(e.target.value)} placeholder="আপনার স্লোগান বা যেকোনো বার্তা" />
            </label>
          </div>
        </FrameForm>
      </main>
      <footer>Made with ♥ by <a href="https://boylar.com" target="_blank" rel="noopener">boylar.com</a></footer>
    </div>
  );
}
