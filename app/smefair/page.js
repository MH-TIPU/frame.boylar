'use client';

import { useEffect, useRef, useState } from 'react';
import { Hind_Siliguri } from 'next/font/google';
import FrameForm from '../../components/FrameForm';
import FrameNav from '../../components/FrameNav';
import { calendarIcon, pinIcon } from '../../lib/icons';
import { loadImage, pickImage } from '../../lib/image';

const hind = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '700'], display: 'swap' });
const FONT = hind.style.fontFamily;

// Geometry in the frame's own 2000x2000 pixel space (measured from public/frames/smefair.jpg).
const SIZE = 2000;
const CIRCLE = { x: 700, y: 930, r: 380 };
const HEAD = ['আমি আসছি', 'আপনি আসছেন তো?'];
const HEAD_BOX = { x: 1200, w: 740, mid: 930 };     // clear of the circle and its ring
// soft light through the sky: x, y, radius, strength
const PUFFS = [
  [250, 520, 420, 0.55], [1520, 470, 450, 0.5], [1780, 1180, 380, 0.42],
  [430, 1300, 430, 0.48], [1040, 760, 520, 0.3], [980, 1420, 360, 0.35],
];
const LOGO = { x: 1480, y: 1646, w: 440, h: 140 };  // slot for the entrepreneur's own logo
const BAND = { y: 106, h: 209 };                    // the cream strip, repainted with the fair's lockup
const FOOT = { y: 1506, h: 416 };                   // the old logo row and wave, repainted as one band
const BASE = { yellow: 1922, green: 1932 };         // a plain foot in place of the artwork's dipped one
const CREAM = '#ffffeb', DARK = '#005c4b', GREEN = '#1ea851';
const FAIR = 'জাতীয় এসএমই পণ্য মেলা ২০২৬';
const DATES = '২২ থেকে ২৮ নভেম্বর ২০২৬';
const VENUE = 'বাংলাদেশ-চীন মৈত্রী সম্মেলন কেন্দ্র, আগারগাঁও, ঢাকা';

export default function Page() {
  const canvas = useRef(null);
  const logoInput = useRef(null);
  // What the canvas draws. Kept in a ref (not state) so dragging redraws without re-rendering.
  const s = useRef({ frame: null, motifs: null, mela: null, chakri: null, photo: null, logo: null, zoom: 1, ox: 0, oy: 0, last: null }).current;
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [zoom, setZoom] = useState(1);

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    // the sky, drawn rather than taken from the artwork, so nothing in it constrains
    // where the photo and the headline can sit
    ctx.fillStyle = '#efecd9';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const top = BAND.y + BAND.h, mid = FOOT.y - top;
    const sky = ctx.createLinearGradient(0, top, 0, FOOT.y);
    sky.addColorStop(0, '#f9f6e8');
    sky.addColorStop(1, '#e8e4ca');
    ctx.fillStyle = sky;
    ctx.fillRect(0, top, SIZE, mid);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, SIZE, mid);
    ctx.clip();
    for (const [cx, cy, r, alpha] of PUFFS) {
      const puff = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      puff.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      puff.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = puff;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();

    if (s.motifs) ctx.drawImage(s.motifs, 0, 0, SIZE, SIZE);   // small trades over the sky

    // the cream strip: the fair's own logo and name, then when and where
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, BAND.y, SIZE, BAND.h);
    if (s.mela) {
      const h = 140, w = s.mela.width * h / s.mela.height;
      ctx.drawImage(s.mela, 120, BAND.y + (BAND.h - h) / 2, w, h);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 64px ${FONT}`;
    ctx.fillStyle = DARK;
    ctx.fillText(FAIR, SIZE / 2, BAND.y + BAND.h / 2 + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (s.chakri) {
      const h = 150, w = s.chakri.width * h / s.chakri.height;
      ctx.drawImage(s.chakri, SIZE - 120 - w, BAND.y + (BAND.h - h) / 2, w, h);
    }

    // and the row that held the partner logos, as a matching band: when and where the
    // fair is at the left, room for the entrepreneur's own logo at the right
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, FOOT.y, SIZE, FOOT.h);
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(0, BASE.yellow, SIZE, BASE.green - BASE.yellow);
    ctx.fillStyle = DARK;
    ctx.fillRect(0, BASE.green, SIZE, SIZE - BASE.green);
    let fy = FOOT.y + 140;
    for (const [icon, text, size, weight, colour] of [
      [calendarIcon, DATES, 58, 700, DARK],
      [pinIcon, VENUE, 48, 400, '#35705a'],
    ]) {
      icon(ctx, 140, fy, size, GREEN);
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = colour;
      ctx.fillText(text, 140 + size + 22, fy + size * 0.82);
      fy += size + 32;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(CIRCLE.x, CIRCLE.y, CIRCLE.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(CIRCLE.x - CIRCLE.r, CIRCLE.y - CIRCLE.r, CIRCLE.r * 2, CIRCLE.r * 2);
    if (s.photo) {
      const d = CIRCLE.r * 2;
      const k = Math.max(d / s.photo.width, d / s.photo.height) * s.zoom;   // "cover" the circle
      const w = s.photo.width * k, h = s.photo.height * k;
      // keep the circle fully covered while dragging
      s.ox = Math.max(-(w - d) / 2, Math.min((w - d) / 2, s.ox));
      s.oy = Math.max(-(h - d) / 2, Math.min((h - d) / 2, s.oy));
      ctx.drawImage(s.photo, CIRCLE.x - w / 2 + s.ox, CIRCLE.y - h / 2 + s.oy, w, h);
    }
    ctx.restore();

    // a fine double ring in place of the artwork's heavy one
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(CIRCLE.x, CIRCLE.y, CIRCLE.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 92, 75, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(CIRCLE.x, CIRCLE.y, CIRCLE.r + 28, 0, Math.PI * 2);
    ctx.stroke();

    // the headline, set in two lines and sized to the room beside the photo
    let head = 108;
    ctx.font = `700 ${head}px ${FONT}`;
    const widest = Math.max(...HEAD.map(t => ctx.measureText(t).width));
    if (widest > HEAD_BOX.w) {
      head = Math.floor(head * HEAD_BOX.w / widest);
      ctx.font = `700 ${head}px ${FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DARK;
    HEAD.forEach((line, i) => {
      ctx.fillText(line, HEAD_BOX.x + HEAD_BOX.w / 2, HEAD_BOX.mid + (i - 0.5) * head * 1.34);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (s.logo) {
      const k = Math.min(LOGO.w / s.logo.width, LOGO.h / s.logo.height);    // "contain" in the slot
      const w = s.logo.width * k, h = s.logo.height * k;
      ctx.drawImage(s.logo, LOGO.x + (LOGO.w - w) / 2, LOGO.y + (LOGO.h - h) / 2, w, h);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const [motifs, mela, chakri] = await Promise.all([
        loadImage('/frames/smemotifs.svg').catch(() => null),
        loadImage('/logos/mela2026.png').catch(() => null),
        loadImage('/logos/chakri.png').catch(() => null),
      ]);
      if (!alive) return;
      Object.assign(s, { motifs, mela, chakri });
      try {
        await Promise.all([400, 700].map(w => document.fonts.load(`${w} 52px ${FONT}`)));
        await document.fonts.ready;
      } catch { /* fall back to whatever the system has */ }
      if (alive) draw();
    })();
    return () => { alive = false; };
  }, []);

  const pickPhoto = e => pickImage(e, img => {
    Object.assign(s, { photo: img, zoom: 1, ox: 0, oy: 0 });
    setZoom(1);
    setHasPhoto(true);
  }, draw);
  const pickLogo = e => pickImage(e, img => { s.logo = img; setHasLogo(true); }, draw);
  const clearLogo = () => { s.logo = null; logoInput.current.value = ''; setHasLogo(false); draw(); };
  const changeZoom = e => { s.zoom = +e.target.value; setZoom(s.zoom); draw(); };

  // Drag to reposition the photo
  const dragStart = e => {
    if (!s.photo) return;
    s.last = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragMove = e => {
    if (!s.last) return;
    const k = SIZE / e.currentTarget.clientWidth;   // CSS pixels -> canvas pixels
    s.ox += (e.clientX - s.last.x) * k;
    s.oy += (e.clientY - s.last.y) * k;
    s.last = { x: e.clientX, y: e.clientY };
    draw();
  };
  const dragEnd = () => { s.last = null; };

  return (
    <div className={hind.className}>
      <header>
        <h1>Add your photo and company logo, then download and share</h1>
        <FrameNav current="/smefair" />
      </header>
      <main>
        <canvas
          ref={canvas} width={SIZE} height={SIZE} aria-label="Frame preview"
          className={hasPhoto ? 'movable' : undefined}
          onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
        />
        <FrameForm
          source="smefair" fileName="sme-mela-2026-frame.jpg" stepNo="৩"
          canvasRef={canvas} canDownload={hasPhoto}
        >
          <div className="step">
            <label>
              <b>১. আপনার ছবি <span>Your photo</span></b>
              <input type="file" accept="image/*" onChange={pickPhoto} />
            </label>
            {hasPhoto && (
              <>
                <label className="zoom">
                  <span>জুম · Zoom</span>
                  <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={changeZoom} />
                </label>
                <small>ছবি টেনে সরান · Drag the photo to reposition</small>
              </>
            )}
          </div>
          <div className="step">
            <label>
              <b>২. কোম্পানির লোগো <span>Company logo (optional)</span></b>
              <input ref={logoInput} type="file" accept="image/*" onChange={pickLogo} />
            </label>
            <small>স্বচ্ছ (transparent) PNG সবচেয়ে ভালো দেখায়</small>
            {hasLogo && <button className="link" type="button" onClick={clearLogo}>লোগো সরান · Remove logo</button>}
          </div>
        </FrameForm>
      </main>
      <footer>Made with ♥ by <a href="https://boylar.com" target="_blank" rel="noopener">boylar.com</a></footer>
    </div>
  );
}
