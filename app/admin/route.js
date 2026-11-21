// GET /admin            — table of leads
// GET /admin?format=csv — the same rows as a CSV download
// Protected by HTTP Basic Auth: user "admin", password from ADMIN_PASSWORD. Serve over HTTPS only.
// ponytail: no login throttling (use a long random password) and no pagination (fine up to tens of thousands of rows).
import { createHash, timingSafeEqual } from 'node:crypto';
import { pool } from '../../lib/db';

export const dynamic = 'force-dynamic';

const COLUMNS = ['source', 'name', 'business', 'url', 'email'];
const HEADINGS = ['Time', 'Page', 'Name', 'Business', 'Website', 'Email'];
const PAGES = { smefair: 'ফটো ফ্রেম · Photo frame', fbcover: 'স্টল কভার · Stall cover' };

const sha = text => createHash('sha256').update(text).digest();

function authorized(request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;   // not configured: nobody gets in
  const expected = 'Basic ' + Buffer.from('admin:' + password).toString('base64');
  return timingSafeEqual(sha(request.headers.get('authorization') ?? ''), sha(expected));
}

// Lead values are untrusted: escape them for HTML, and for CSV also stop spreadsheet formulas.
const html = v => String(v).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const csv = v => {
  v = String(v);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
};
const dhakaTime = date => date.toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' });   // 2026-11-21 14:05:09

export async function GET(request) {
  if (!authorized(request)) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Leads", charset="UTF-8"' },
    });
  }

  const [{ rows }, made] = await Promise.all([
    pool.query('SELECT created_at, source, name, business, url, email FROM leads ORDER BY id DESC'),
    pool.query('SELECT source, count(*)::int AS n FROM downloads GROUP BY source')
      .then(r => r.rows, () => []),   // the table may not exist yet on an older database
  ]);
  const table = rows.map(r => [dhakaTime(r.created_at), ...COLUMNS.map(c => r[c])]);

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const body = [HEADINGS, ...table].map(line => line.map(csv).join(',')).join('\r\n') + '\r\n';
    return new Response('﻿' + body, {   // BOM so Excel reads Bengali text as UTF-8
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-${dhakaTime(new Date()).slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const page = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Leads</title>
<style>
  body { margin: 0; padding: 16px; font-family: system-ui, "Noto Sans Bengali", sans-serif; color: #1d2b27; background: #f4f3df; }
  h1 { font-size: 1.2rem; margin: 0 0 12px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
  a.export { font-size: .9rem; background: #1ea851; color: #fff; padding: 8px 14px; border-radius: 6px; text-decoration: none; }
  .stats { display: flex; flex-wrap: wrap; gap: 14px; margin: 0 0 18px; }
  .stat { background: #fff; border-radius: 8px; padding: 14px 20px; border-left: 5px solid #1ea851; min-width: 170px; }
  .stat b { display: block; font-size: 1.7rem; line-height: 1.1; color: #005c4b; }
  .stat span { font-size: .85rem; color: #5b6b66; }
  .wrap { overflow-x: auto; background: #fff; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e3e8e5; white-space: nowrap; }
  th { background: #005c4b; color: #fff; }
</style>
<h1>Boylar Frames <a class="export" href="?format=csv">Export CSV</a></h1>
<div class="stats">
${Object.entries(PAGES).map(([key, label]) => {
  const n = made.find(m => m.source === key)?.n ?? 0;
  return `  <div class="stat"><b>${n.toLocaleString('bn-BD')}</b><span>${html(label)} — ডাউনলোড</span></div>`;
}).join('\n')}
  <div class="stat"><b>${made.reduce((t, m) => t + m.n, 0).toLocaleString('bn-BD')}</b><span>মোট ডাউনলোড · all downloads</span></div>
  <div class="stat"><b>${rows.length.toLocaleString('bn-BD')}</b><span>লিড · details left</span></div>
</div>
<div class="wrap"><table>
<tr>${HEADINGS.map(h => `<th>${h}</th>`).join('')}</tr>
${table.map(line => `<tr>${line.map(v => `<td>${html(v)}</td>`).join('')}</tr>`).join('\n')}
</table></div>
${rows.length ? '' : '<p>No leads yet.</p>'}
</html>`;

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
