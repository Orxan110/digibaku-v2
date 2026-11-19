import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRouter } from './routes/public.js';
import { ordersRouter } from './routes/orders.js';
import { meRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler } from './http.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/public', publicRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));
app.use(errorHandler);

export default app;
