// POST /api/download — one row per banner saved, so /admin can show how many each page made.
import { pool } from '../../../lib/db';

export async function POST(request) {
  let source = '';
  try {
    source = String((await request.formData()).get('source') || '').trim().slice(0, 40);
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await pool.query('INSERT INTO downloads (source) VALUES ($1)', [source]);
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('download:', e.message);   // never block the download itself
    return new Response(null, { status: 500 });
  }
}
