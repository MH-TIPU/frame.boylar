'use client';

import { useEffect, useRef, useState } from 'react';

// Geometry in the frame's own 2000x2000 pixel space (measured from public/frames/smefair.jpg).
const SIZE = 2000;
const CIRCLE = { x: 742.5, y: 935.5, r: 492 };      // the white photo circle
const LOGO = { x: 1190, y: 1595, w: 450, h: 140 };  // slot right of the BDOSN logo, same height as it

function loadImage(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('unreadable image'));
    img.src = src;
  });
}

export default function Page() {
  const canvas = useRef(null);
  const form = useRef(null);
  const logoInput = useRef(null);
  // What the canvas draws. Kept in a ref (not state) so dragging redraws without re-rendering.
  const s = useRef({ frame: null, photo: null, logo: null, zoom: 1, ox: 0, oy: 0, last: null, sentLead: '' }).current;
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [leadMsg, setLeadMsg] = useState('');

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

  async function pick(e, apply) {
    const input = e.target, file = input.files[0];
    if (!file) return;
    try {
      apply(await loadImage(URL.createObjectURL(file)));
      draw();
    } catch {
      input.value = '';
      alert('এই ছবিটি খোলা যায়নি। JPG বা PNG ব্যবহার করুন।\nCould not open this image. Please use a JPG or PNG.');
    }
  }

  const pickPhoto = e => pick(e, img => {
    Object.assign(s, { photo: img, zoom: 1, ox: 0, oy: 0 });
    setZoom(1);
    setHasPhoto(true);
  });
  const pickLogo = e => pick(e, img => { s.logo = img; setHasLogo(true); });
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

  // Optional lead: sent once per distinct set of details, only if something was filled in.
  // Resolves to null (nothing to send), true (saved) or false (failed).
  async function sendLead() {
    const data = new URLSearchParams(new FormData(form.current));   // file inputs have no name, so only the 4 text fields
    const body = data.toString();
    if (![...data.values()].some(v => v.trim())) return null;
    if (body === s.sentLead) return true;
    s.sentLead = body;
    data.set('source', 'smefair');   // which page the lead came from
    const ok = await fetch('/api/lead', { method: 'POST', keepalive: true, body: data }).then(r => r.ok, () => false);
    if (!ok) s.sentLead = '';   // not saved: allow another try
    return ok;
  }

  // The Send button submits the form, so the browser validates the email first.
  async function submitLead(e) {
    e.preventDefault();
    const ok = await sendLead();
    setLeadMsg(ok === null ? '' : ok
      ? '✓ ধন্যবাদ! আপনার তথ্য পেয়েছি। · Thank you! We got your details.'
      : 'পাঠানো যায়নি, আবার চেষ্টা করুন। · Could not send. Please try again.');
  }

  function download() {
    if (form.current.checkValidity()) sendLead();   // also covers people who fill in details first and never press Send
    canvas.current.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sme-mela-2026-frame.jpg';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/jpeg', 0.95);
  }

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
        <form className="panel" ref={form} onSubmit={submitLead}>
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
          <button className="download" type="button" disabled={!hasPhoto} onClick={download}>⬇ ডাউনলোড · Download</button>
          <div className="step fields">
            <b>৩. আপনার তথ্য <span>Your details (optional)</span></b>
            <small>
              ঐচ্ছিক। পূরণ করলে আমাদের অন্যান্য আয়োজনে আপনাকে আমন্ত্রণ ও আপনার সাথে যোগাযোগের জন্য এই তথ্য সংরক্ষণ করা হবে।
              <br />
              Optional. If you fill this in, we save it to invite you to our other events and to contact you.
            </small>
            <div className="grid">
              <label>নাম · Name <input name="name" autoComplete="name" maxLength={100} /></label>
              <label>ব্যবসার নাম · Business name <input name="business" autoComplete="organization" maxLength={150} /></label>
              <label>ওয়েবসাইট · Website <input name="url" inputMode="url" autoComplete="url" maxLength={200} placeholder="example.com" /></label>
              <label>ইমেইল · Email <input name="email" type="email" autoComplete="email" maxLength={150} /></label>
            </div>
            <button className="send" type="submit">পাঠান · Send</button>
            <small role="status">{leadMsg}</small>
          </div>
        </form>
      </main>
      <footer>Made with ♥ by <a href="https://boylar.com" target="_blank" rel="noopener">boylar.com</a></footer>
    </>
  );
}
