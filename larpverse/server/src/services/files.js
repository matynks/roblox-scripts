import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../app.js';
import { E } from '../http.js';
import { randomId } from '../security.js';
import { now } from '../util.js';

const TYPES = {
  'image/png': { ext: '.png', magic: (b) => b.length > 8 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG' },
  'image/jpeg': { ext: '.jpg', magic: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: '.webp', magic: (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  'image/gif': { ext: '.gif', magic: (b) => b.length > 6 && b.toString('latin1', 0, 4) === 'GIF8' },
};

/**
 * Stores an uploaded image given as a data URL. The declared type must match the file's
 * magic bytes; files get random names and are served back with their stored type only.
 */
export function saveDataUrl(dataUrl, { ownerUserId, purpose, maxBytes = 2 * 1024 * 1024 }) {
  if (typeof dataUrl !== 'string') throw E.bad('Image is required');
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) throw E.bad('Upload a PNG, JPEG, WebP or GIF image');
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0) throw E.bad('Image is empty');
  if (buf.length > maxBytes) throw E.tooLarge(`Image must be at most ${Math.round(maxBytes / 1024 / 1024)} MB`);
  const type = TYPES[mime];
  if (!type.magic(buf)) throw E.bad('File content does not match its image type');

  const publicId = randomId(16);
  const storageName = `${publicId}${type.ext}`;
  fs.mkdirSync(app.cfg.uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(app.cfg.uploadsDir, storageName), buf, { flag: 'wx' });
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const r = app.db.run(
    `INSERT INTO files (public_id, owner_user_id, mime, size, sha256, storage_name, purpose, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    publicId, ownerUserId ?? null, mime, buf.length, sha256, storageName, purpose, now(),
  );
  return { id: r.id, publicId, url: `/files/${publicId}` };
}

export function fileUrl(fileId) {
  if (!fileId) return null;
  const pid = app.db.value('SELECT public_id FROM files WHERE id = ?', fileId);
  return pid ? `/files/${pid}` : null;
}

export function serveFile(req, res, publicId) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(publicId)) { res.writeHead(404); res.end(); return; }
  const row = app.db.get('SELECT * FROM files WHERE public_id = ?', publicId);
  const file = row && path.join(app.cfg.uploadsDir, row.storage_name);
  if (!row || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': row.mime,
    'Content-Length': row.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': 'inline',
  });
  fs.createReadStream(file).pipe(res);
}
