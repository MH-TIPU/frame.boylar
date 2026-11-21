'use client';

import { useEffect, useRef, useState } from 'react';
import FrameForm from '../../components/FrameForm';
import { loadImage, pickImage } from '../../lib/image';

// Geometry in the frame's own 2000x2000 pixel space (measured from public/frames/smefair.jpg).
const SIZE = 2000;
const CIRCLE = { x: 742.5, y: 935.5, r: 492 };      // the white photo circle
const LOGO = { x: 1190, y: 1595, w: 450, h: 140 };  // slot right of the BDOSN logo, same height as it

export default function Page() {
  const canvas = useRef(null);
  const logoInput = useRef(null);
  // What the canvas draws. Kept in a ref (not state) so dragging redraws without re-rendering.
  const s = useRef({ frame: null, photo: null, logo: null, zoom: 1, ox: 0, oy: 0, last: null }).current;
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [zoom, setZoom] = useState(1);

  function draw() {
    if (!s.frame) return;
    const ctx = canvas.current.getContext('2d');
    ctx.drawImage(s.frame, 0, 0, SIZE, SIZE);
    if (s.photo) {
      const d = CIRCLE.r * 2;
      const k = Math.max(d / s.photo.width, d / s.photo.height) * s.zoom;   // "cover" the circle
      const w = s.photo.width * k, h = s.photo.height * k;
      // keep the circle fully covered while dragging
      s.ox = Math.max(-(w - d) / 2, Math.min((w - d) / 2, s.ox));
      s.oy = Math.max(-(h - d) / 2, Math.min((h - d) / 2, s.oy));
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE.x, CIRCLE.y, CIRCLE.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(s.photo, CIRCLE.x - w / 2 + s.ox, CIRCLE.y - h / 2 + s.oy, w, h);
      ctx.restore();
    }
    if (s.logo) {
      const k = Math.min(LOGO.w / s.logo.width, LOGO.h / s.logo.height);    // "contain" in the slot
      const w = s.logo.width * k, h = s.logo.height * k;
      ctx.drawImage(s.logo, LOGO.x + (LOGO.w - w) / 2, LOGO.y + (LOGO.h - h) / 2, w, h);
    }
  }

  useEffect(() => {
    loadImage('/frames/smefair.jpg').then(img => { s.frame = img; draw(); });
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
    <>
      <header>
        <h1>Add your photo and company logo, then download and share</h1>
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
    </>
  );
}
