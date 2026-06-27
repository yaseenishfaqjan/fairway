import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import clubRoutes from './routes/clubs.js';
import memberRoutes from './routes/members.js';
import teeSheetRoutes from './routes/teeSheet.js';
import bookingRoutes from './routes/bookings.js';
import posRoutes from './routes/pos.js';
import inventoryRoutes from './routes/inventory.js';
import tournamentRoutes from './routes/tournaments.js';
import dashboardRoutes from './routes/dashboard.js';
import staffRoutes from './routes/staff.js';
import maintenanceRoutes from './routes/maintenance.js';
import notificationRoutes from './routes/notifications.js';

const app = express();

app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
if (config.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/clubs', clubRoutes);
v1.use('/members', memberRoutes);
v1.use('/tee-sheet', teeSheetRoutes);
v1.use('/bookings', bookingRoutes);
v1.use('/pos', posRoutes);
v1.use('/inventory', inventoryRoutes);
v1.use('/tournaments', tournamentRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/staff', staffRoutes);
v1.use('/maintenance', maintenanceRoutes);
v1.use('/notifications', notificationRoutes);
app.use('/api/v1', v1);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`[server] Fairway360 API listening on http://localhost:${config.PORT}/api/v1`);
});

export default app;
