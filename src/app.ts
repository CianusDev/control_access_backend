import express from 'express';
import UserRoute from './routes/user/route'
import AuthRoute from './routes/auth/route'
import RoleRoute from './routes/role/route'
import BadgeRoute from './routes/badge/route'
import DeviceRoute from './routes/device/route'

export const app = express();
app.use(express.json()); // 👈 nécessaire pour parser le JSON

/*
 * Routes
 */
app.use('/api/auth',AuthRoute);  
app.use('/api/users', UserRoute); 
app.use('/api/roles', RoleRoute); 
app.use('/api/badges', BadgeRoute); 
app.use('/api/devices', DeviceRoute);

