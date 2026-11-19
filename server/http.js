export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[server]', err);
  res.status(status).json({ error: status >= 500 ? 'server_error' : err.message });
}

export function pick(source = {}, fields) {
  const out = {};
  for (const f of fields) if (source[f] !== undefined) out[f] = source[f];
  return out;
}

export const toNumber = (v) =>
  v === '' || v === null || v === undefined ? null : Number(v);

export const round2 = (n) => Math.round(n * 100) / 100;

export const isSafeUrl = (u) => /^(https?:\/\/|\/)/.test(u);
