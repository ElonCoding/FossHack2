import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './lib/db';
import { errorMiddleware } from './middlewares/errorMiddleware';
import v1Routes from './routes/v1Routes';

const app = express();
const PORT = process.env.PORT || 5000;

const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin denied'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', message: 'Event Platform API is running' });
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', v1Routes);
app.use('/api', v1Routes);

app.use(errorMiddleware);

const bootstrap = async () => {
  console.log('Starting server initialization...');
  try {
    await connectDB();
    console.log('Database connection logic finished');
  } catch (err) {
    console.error('Initial database connection failed:', err);
  }
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

if (typeof require !== 'undefined' && require.main === module) {
  bootstrap();
}

export const prisma: any = {};
export { app };
