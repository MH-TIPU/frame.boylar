// GET  /admin             — the dashboard: counts, the last fortnight, and every lead
// GET  /admin?format=csv  — the same leads as a CSV download
// GET  /admin?logout=1    — forget this browser
// POST /admin             — the login form; the password is ADMIN_PASSWORD
//
// Signing in sets a cookie holding an expiry and an HMAC of it, keyed on the password, so
// there is nothing to look up and changing the password signs everyone out. Serve over HTTPS.
// ponytail: no login throttling (use a long random password) and no pagination (fine up to
// tens of thousands of rows).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from '../../lib/db';

export const dynamic = 'force-dynamic';

const COLUMNS = ['source', 'name', 'business', 'url', 'email'];
const HEADINGS = ['Time', 'Page', 'Name', 'Business', 'Website', 'Email'];
const PAGES = {
  smefair: { label: 'ফটো ফ্রেম', en: 'Photo frame', href: '/smefair' },
  fbcover: { label: 'স্টল কভার', en: 'Stall cover', href: '/fbcover' },
  'fbcover-mobile': { label: 'স্টল কভার · মোবাইল', en: 'Stall cover (mobile)', href: '/fbcover-mobile' },
};
const COOKIE = 'frameadmin';
const DAYS = 14;                      // how far back the little chart looks
const LIFE = 7 * 24 * 60 * 60;        // how long a sign-in lasts, in seconds

const sha = text => createHash('sha256').update(String(text)).digest();
const same = (a, b) => timingSafeEqual(sha(a), sha(b));

const sign = exp => createHmac('sha256', process.env.ADMIN_PASSWORD).update(String(exp)).digest('hex');

function signedIn(request) {
  if (!process.env.ADMIN_PASSWORD) return false;   // not configured: nobody gets in
  const [exp, mac] = String(request.cookies.get(COOKIE)?.value ?? '').split('.');
  if (!exp || !mac || !(Number(exp) > Date.now())) return false;
  return same(mac, sign(exp));
}

function cookie(request, value, age) {
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.slice(0, -1);
  const secure = proto === 'https' ? '; Secure' : '';   // left off on a local http preview
  return `${COOKIE}=${value}; Path=/admin; Max-Age=${age}; HttpOnly; SameSite=Lax${secure}`;
}

// Lead values are untrusted: escape them for HTML, and for CSV also stop spreadsheet formulas.
const html = v => String(v).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const csv = v => {
  v = String(v);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
};
const dhaka = date => date.toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' });   // 2026-11-21 14:05:09
const bn = n => n.toLocaleString('bn-BD');

const shell = (title, body, extraCss = '', status = 200) => new Response(`<!doctype html>
<html lang="bn">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { --dark:#005c4b; --green:#1ea851; --bg:#f4f3df; --muted:#5b6b66; --line:#e3e8e5; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, "Noto Sans Bengali", sans-serif; color:#1d2b27; background:var(--bg); }
  a { color: inherit; }
${extraCss}
</style>
${body}
</html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

function loginPage(message = '', status = 200) {
  return shell('Sign in · Boylar Frames', `
<main class="box">
  <form method="post">
    <h1>Boylar Frames</h1>
    <p>অ্যাডমিন প্যানেল · admin panel</p>
    <label>পাসওয়ার্ড · Password
      <input type="password" name="password" autocomplete="current-password" autofocus required>
    </label>
    ${message ? `<p class="bad">${html(message)}</p>` : ''}
    <button type="submit">প্রবেশ করুন · Sign in</button>
  </form>
</main>`, `
  .box { min-height:100vh; display:grid; place-items:center; padding:24px; }
  form { background:#fff; border-radius:12px; padding:32px; width:min(380px,100%); border-top:6px solid var(--green);
         box-shadow:0 6px 28px #0000001a; }
  h1 { margin:0; font-size:1.3rem; color:var(--dark); }
  form p { margin:6px 0 24px; color:var(--muted); font-size:.9rem; }
  label { display:block; font-size:.9rem; color:var(--muted); }
  input { display:block; width:100%; margin-top:8px; padding:12px; font:inherit; border:1px solid #c5cfca; border-radius:8px; }
  input:focus { outline:2px solid var(--green); outline-offset:1px; }
  .bad { margin:14px 0 0; color:#b3261e; font-size:.9rem; }
  button { width:100%; margin-top:20px; padding:13px; font:inherit; font-weight:700; border:0; border-radius:8px;
           background:var(--green); color:#fff; cursor:pointer; }
  button:hover { background:#179247; }
`, status);
}

export async function POST(request) {
  const given = String((await request.formData()).get('password') ?? '');
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return loginPage('ADMIN_PASSWORD সেট করা নেই · not configured', 503);
  if (!same(given, password)) return loginPage('ভুল পাসওয়ার্ড · Wrong password', 401);

  const exp = Date.now() + LIFE * 1000;
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': cookie(request, `${exp}.${sign(exp)}`, LIFE) },
  });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;

  if (params.has('logout')) {
    return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': cookie(request, '', 0) } });
  }
  if (!signedIn(request)) return loginPage();

  const [{ rows }, made, daily] = await Promise.all([
    pool.query('SELECT created_at, source, name, business, url, email FROM leads ORDER BY id DESC'),
    // the downloads table may not exist yet on an older database
    pool.query('SELECT source, count(*)::int AS n FROM downloads GROUP BY source').then(r => r.rows, () => []),
    pool.query(
      `SELECT (created_at AT TIME ZONE 'Asia/Dhaka')::date::text AS day, count(*)::int AS n
         FROM downloads
        WHERE created_at >= now() - ($1 || ' days')::interval
        GROUP BY 1`, [DAYS],
    ).then(r => r.rows, () => []),
  ]);
  const table = rows.map(r => [dhaka(r.created_at), ...COLUMNS.map(c => r[c])]);

  if (params.get('format') === 'csv') {
    const body = [HEADINGS, ...table].map(line => line.map(csv).join(',')).join('\r\n') + '\r\n';
    return new Response('﻿' + body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-${dhaka(new Date()).slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // the last DAYS days in Dhaka time, oldest first, with the quiet days filled in as zero
  const today = dhaka(new Date()).slice(0, 10);
  const span = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - i);
    const iso = day.toISOString().slice(0, 10);
    span.push({ iso, n: daily.find(d => d.day === iso)?.n ?? 0 });
  }
  const peak = Math.max(1, ...span.map(d => d.n));
  const week = span.slice(-7).reduce((t, d) => t + d.n, 0);
  const totalMade = made.reduce((t, m) => t + m.n, 0);
  const withEmail = rows.filter(r => r.email.trim()).length;
  const leadsBy = source => rows.filter(r => r.source === source).length;

  const card = (value, label, note = '') =>
    `<div class="stat"><b>${bn(value)}</b><span>${label}</span>${note ? `<i>${note}</i>` : ''}</div>`;

  return shell('Boylar Frames · admin', `
<header>
  <strong>Boylar Frames</strong>
  <nav>
    ${Object.values(PAGES).map(p => `<a href="${p.href}" target="_blank" rel="noopener">${p.label} ↗</a>`).join('')}
    <a class="go" href="?format=csv">⬇ Export CSV</a>
    <a class="out" href="?logout=1">Log out</a>
  </nav>
</header>
<main>
  <section class="stats">
    ${card(totalMade, 'মোট ডাউনলোড', 'all downloads')}
    ${card(span[span.length - 1].n, 'আজ', 'today')}
    ${card(week, 'গত ৭ দিন', 'last 7 days')}
    ${card(rows.length, 'লিড', 'details left')}
    ${card(withEmail, 'ইমেইল সহ', 'with an email')}
  </section>

  <section class="panel">
    <h2>পেজ অনুযায়ী · by page</h2>
    <table class="pages">
      <tr><th>পেজ</th><th>ডাউনলোড</th><th>লিড</th></tr>
      ${Object.entries(PAGES).map(([key, p]) => `<tr>
        <td><a href="${p.href}" target="_blank" rel="noopener">${p.label}</a> <small>${p.en}</small></td>
        <td class="n">${bn(made.find(m => m.source === key)?.n ?? 0)}</td>
        <td class="n">${bn(leadsBy(key))}</td>
      </tr>`).join('')}
    </table>
  </section>

  <section class="panel">
    <h2>গত ${bn(DAYS)} দিনের ডাউনলোড · last ${DAYS} days</h2>
    <div class="chart">
      ${span.map(d => `<div class="bar" title="${d.iso}: ${d.n}">
        <u>${d.n ? bn(d.n) : ''}</u>
        <i style="height:${Math.round(d.n / peak * 100)}%"></i>
        <span>${d.iso.slice(8)}</span>
      </div>`).join('')}
    </div>
  </section>

  <section class="panel">
    <h2>লিড · ${bn(rows.length)} details left</h2>
    ${rows.length ? `<div class="wrap"><table>
      <tr>${HEADINGS.map(h => `<th>${h}</th>`).join('')}</tr>
      ${table.map(line => `<tr>${line.map(v => `<td>${html(v)}</td>`).join('')}</tr>`).join('')}
    </table></div>` : '<p class="empty">এখনো কেউ তথ্য দেয়নি · nobody has left their details yet.</p>'}
  </section>
</main>`, `
  header { background:var(--dark); color:#fff; padding:14px 20px; display:flex; flex-wrap:wrap; gap:12px;
           align-items:center; justify-content:space-between; border-bottom:5px solid #ffe600; }
  header strong { font-size:1.05rem; }
  header nav { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  header nav a { font-size:.85rem; text-decoration:none; padding:7px 14px; border-radius:999px; border:1px solid #ffffff5c; }
  header nav a:hover { background:#ffffff26; }
  header nav a.go { background:var(--green); border-color:var(--green); font-weight:700; }
  header nav a.out { border-color:#ffffff2e; color:#ffffffb3; }
  main { max-width:1200px; margin:0 auto; padding:22px 20px 48px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:22px; }
  .stat { background:#fff; border-radius:10px; padding:16px 20px; border-left:5px solid var(--green); }
  .stat b { display:block; font-size:1.9rem; line-height:1.1; color:var(--dark); }
  .stat span { font-size:.9rem; }
  .stat i { display:block; font-style:normal; font-size:.78rem; color:var(--muted); }
  .panel { background:#fff; border-radius:10px; padding:18px 20px; margin-bottom:22px; }
  .panel h2 { margin:0 0 14px; font-size:1rem; color:var(--dark); }
  table { border-collapse:collapse; width:100%; font-size:.9rem; }
  th, td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); white-space:nowrap; }
  .wrap { overflow-x:auto; }
  .wrap th { background:var(--dark); color:#fff; position:sticky; top:0; }
  .pages th { color:var(--muted); font-weight:400; font-size:.8rem; }
  .pages td small { color:var(--muted); }
  .pages .n { text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
  .chart { display:flex; align-items:flex-end; gap:6px; height:160px; }
  .bar { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; gap:4px; }
  .bar u { font-size:.72rem; color:var(--muted); text-decoration:none; }
  .bar i { width:100%; min-height:3px; background:var(--green); border-radius:4px 4px 0 0; }
  .bar span { font-size:.7rem; color:var(--muted); }
  .empty { margin:0; color:var(--muted); }
`);
}
