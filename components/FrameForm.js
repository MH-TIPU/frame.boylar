'use client';

import { useRef, useState } from 'react';

// The panel both frame pages share: their own controls, then Download, then the optional
// details we collect. Page-specific inputs must not carry a `name`, or they would be
// posted as lead data along with the four fields below.
export default function FrameForm({ source, fileName, canvasRef, canDownload, stepNo, children }) {
  const form = useRef(null);
  const sent = useRef('');
  const [leadMsg, setLeadMsg] = useState('');

  // Sent once per distinct set of details, only if something was filled in.
  // Resolves to null (nothing to send), true (saved) or false (failed).
  async function sendLead() {
    const data = new URLSearchParams(new FormData(form.current));
    const body = data.toString();
    if (![...data.values()].some(v => v.trim())) return null;
    if (body === sent.current) return true;
    sent.current = body;
    data.set('source', source);   // which page the lead came from
    const ok = await fetch('/api/lead', { method: 'POST', keepalive: true, body: data }).then(r => r.ok, () => false);
    if (!ok) sent.current = '';   // not saved: allow another try
    return ok;
  }

  // The Send button submits the form, so the browser validates the email first.
  async function submit(e) {
    e.preventDefault();
    const ok = await sendLead();
    setLeadMsg(ok === null ? '' : ok
      ? '✓ ধন্যবাদ! আপনার তথ্য পেয়েছি। · Thank you! We got your details.'
      : 'পাঠানো যায়নি, আবার চেষ্টা করুন। · Could not send. Please try again.');
  }

  function download() {
    if (form.current.checkValidity()) sendLead();   // also covers people who fill in details first and never press Send
    fetch('/api/download', {
      method: 'POST',
      keepalive: true,
      body: new URLSearchParams({ source }),
    }).catch(() => { /* counting must never get in the way of the download */ });
    canvasRef.current.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/jpeg', 0.97);
  }

  return (
    <form className="panel" ref={form} onSubmit={submit}>
      {children}
      <button className="download" type="button" disabled={!canDownload} onClick={download}>
        ⬇ ডাউনলোড · Download
      </button>
      <div className="step fields">
        <b>{stepNo}. আপনার তথ্য <span>Your details (optional)</span></b>
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
  );
}
