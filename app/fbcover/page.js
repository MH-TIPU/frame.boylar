'use client';

import { useEffect, useRef, useState } from 'react';
import { Hind_Siliguri } from 'next/font/google';
import FrameForm from '../../components/FrameForm';
import { loadImage, pickImage } from '../../lib/image';

// Self-hosted so the Bengali on the canvas looks the same on every device.
const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '700'], display: 'swap' });
const FONT = hind.style.fontFamily;

// Facebook cover canvas, in its own pixel space (2x the 820x312 it is shown at).
const W = 1640, H = 624;
const BAND = 98;                                      // cream partner-logo strip at the top
const SLOT = { x: 56, w: 400, h: 164 };               // the entrepreneur's own logo
const STALL = { x: 900, y: 126, w: 684, h: 414 };     // the stall photo
const FACIA = 92;                                     // signboard strip across the stall photo
const TEXT = { x: 56, w: 800, size: 32, line: 45 };   // invitation
const NOTE = { size: 27, line: 36 };                  // the entrepreneur's own message
const FAIR = '১৩তম জাতীয় এসএমই পণ্য মেলায়';
const BOTTOM = 540;                                   // content must stay above the bottom wave

const CREAM = '#fffeeb', DARK = '#005c4b', GREEN = '#1ea851', YELLOW = '#ffe600', INK = '#14362c';

// Where the stall number lands on the standard stall, in that drawing's own 684x414 frame.
const BOOTH_FACIA = { x: 56, y: 30, w: 572, h: 86 };

const FIXED = {
  booth: '/frames/booth.svg',
  mela: '/logos/mela2026.png',
  smef: '/logos/smef.png',
  chakri: '/logos/chakri.png',
  bdosn: '/logos/bdosn.png',
  sahosika: '/logos/sahosika.png',
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

// "স্টল নম্বর 123" centred on a facia, shrinking to fit if the number is long.
function stallNumber(ctx, box, number, labelColour, numberColour) {
  const label = 'স্টল নম্বর';
  let ls = 32, ns = 54;
  const measure = () => {
    ctx.font = font(400, ls);
    const lw = ctx.measureText(label).width;
    ctx.font = font(700, ns);
    return [lw, ctx.measureText(number).width];
  };
  let [lw, nw] = measure();
  const room = box.w - 40;
  if (lw + 20 + nw > room) {
    const k = room / (lw + 20 + nw);
    ls = Math.round(ls * k);
    ns = Math.round(ns * k);
    [lw, nw] = measure();
  }
  const x = box.x + (box.w - lw - 20 - nw) / 2;
  const base = box.y + box.h / 2 + ns * 0.34;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(400, ls);
  ctx.fillStyle = labelColour;
  ctx.fillText(label, x, base);
  ctx.font = font(700, ns);
  ctx.fillStyle = numberColour;
  ctx.fillText(number, x + lw + 20, base);
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
    for (const [colour, top] of [[YELLOW, 548], [DARK, 574]]) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.quadraticCurveTo(W / 2, top + 76, W, top);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
    }

    // partner logos on a cream band: organisers left, hosts right
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, BAND);
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, BAND, W, 5);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, BAND + 5, W, 3);
    const f = s.fixed, mid = BAND / 2;
    const melaW = byHeight(ctx, f.mela, 48, mid, 68);
    byHeight(ctx, f.smef, 48 + melaW + 28, mid, 50);
    const right = [[f.chakri, 54], [f.bdosn, 46], [f.sahosika, 54]];
    const widths = right.map(([img, h]) => (img ? img.width * h / img.height : 0));
    let x = 1592 - widths.reduce((a, b) => a + b, 0) - 28 * (right.length - 1);
    right.forEach(([img, h], i) => { byHeight(ctx, img, x, mid, h); x += widths[i] + 28; });

    // left column: logo, invitation and optional message, centred together so the
    // block stays balanced however much text there is
    const runs = [
      { text: business.trim() || 'আপনার প্রতিষ্ঠানের নাম', bold: true },
      { text: `থাকছে এবারে ${FAIR}।` },
      { text: stallNo.trim() ? 'আপনাদের আমন্ত্রণ রইল আমাদের স্টলে, স্টল নম্বর' : 'আপনাদের আমন্ত্রণ রইল আমাদের স্টলে।' },
    ];
    if (stallNo.trim()) runs.push({ text: stallNo.trim(), bold: true, mark: true });
    const lines = layout(ctx, runs, TEXT.w, TEXT.size);
    const note = message.trim() ? layout(ctx, [{ text: message.trim() }], TEXT.w - 24, NOTE.size) : null;
    const blockH = SLOT.h + 46 + lines.length * TEXT.line + (note ? 30 + note.length * NOTE.line : 0);
    const top = Math.max(BAND + 22, (BAND + BOTTOM - blockH) / 2);

    if (s.logo) {
      const k = Math.min(SLOT.w / s.logo.width, SLOT.h / s.logo.height);
      const w = s.logo.width * k, h = s.logo.height * k;
      ctx.drawImage(s.logo, SLOT.x, top + (SLOT.h - h) / 2, w, h);
    } else {
      placeholder(ctx, { ...SLOT, y: top }, 'আপনার লোগো');
    }

    const textTop = top + SLOT.h + 46;
    drawLines(ctx, lines, TEXT.x, textTop + TEXT.size * 0.8, TEXT.size, TEXT.line, INK);

    if (note) {
      const noteTop = textTop + lines.length * TEXT.line + 30;
      ctx.fillStyle = GREEN;
      ctx.fillRect(TEXT.x, noteTop, 5, note.length * NOTE.line - 8);
      drawLines(ctx, note, TEXT.x + 24, noteTop + NOTE.size * 0.8, NOTE.size, NOTE.line, '#3c5a4f');
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
    const number = stallNo.trim();
    if (number && s.stall) {
      // their own photo: a signboard strip of ours across the top
      ctx.fillStyle = DARK;
      ctx.fillRect(STALL.x, STALL.y, STALL.w, FACIA);
      ctx.fillStyle = YELLOW;
      ctx.fillRect(STALL.x, STALL.y + FACIA - 5, STALL.w, 5);
      stallNumber(ctx, { x: STALL.x, y: STALL.y, w: STALL.w, h: FACIA }, number, CREAM, YELLOW);
    } else if (number) {
      // the standard stall: printed on its own blank facia
      stallNumber(ctx, {
        x: STALL.x + BOOTH_FACIA.x, y: STALL.y + BOOTH_FACIA.y, w: BOOTH_FACIA.w, h: BOOTH_FACIA.h,
      }, number, '#6d7d89', DARK);
    }
    ctx.restore();
    roundRect(ctx, STALL.x, STALL.y, STALL.w, STALL.h, 18);
    ctx.lineWidth = 6;
    ctx.strokeStyle = CREAM;
    ctx.stroke();
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
        await Promise.all([400, 700].map(w => document.fonts.load(font(w, 40))));
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
