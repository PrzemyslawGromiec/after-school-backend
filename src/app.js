import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';

import lessonsRouter from './routes/lessons.js';
import ordersRouter from './routes/orders.js';

export function buildApp({ corsOrigin }) {
  const app = express();

    // Logger
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - t0;
      console.log(`[LOG] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });
  app.use(morgan('dev'));

    // Middleware
  app.use(express.json());
  app.use(cors({ origin: corsOrigin?.split(',') || '*' }));

  // Health
  app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));


  const IMAGES_DIR = path.resolve(process.cwd(), 'src', 'images');
  app.get('/images/:file', (req, res) => {
    const file = req.params.file;
    const abs = path.join(IMAGES_DIR, file);
    if (!abs.startsWith(IMAGES_DIR) || !fs.existsSync(abs)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.sendFile(abs);
  });

  // Routes
  app.use('/api/lessons', lessonsRouter);
  app.use('/api/orders', ordersRouter);

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  });

  return app;
}
