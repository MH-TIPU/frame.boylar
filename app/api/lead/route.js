// POST /api/lead — stores the optional details form in PostgreSQL (table: schema.sql).
// ponytail: no rate limiting, anyone can POST rows. Add a throttle or CAPTCHA if spam shows up.
import { pool } from '../../../lib/db';

const status = code => new Response(null, { status: code });

export async function POST(request) {
  let form;
  try { form = await request.formData(); } catch { return status(400); }

  const [source, ...row] = ['source', 'name', 'business', 'url', 'email'].map(key => {
    const v = form.get(key);
    return typeof v === 'string' ? v.trim().slice(0, 200) : '';
  });
  const email = row[3];

  if (!row.some(Boolean)) return status(204);   // nothing filled in: nothing to store
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return status(422);

  try {
    await pool.query('INSERT INTO leads (source, name, business, url, email) VALUES ($1, $2, $3, $4, $5)', [source, ...row]);
    return status(204);
  } catch (e) {
    console.error('lead:', e.message);
    return status(500);
  }
}
