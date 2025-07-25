import express from 'express';
import UserRoute from './routes/user.route'
import AuthRoute from './routes/auth.route'
import RoleRoute from './routes/role.route'
import BadgeRoute from './routes/badge.route'
import DeviceRoute from './routes/device.route'
import AccessLogRoute from './routes/access-log.route'
import AlertRoute from './routes/alert.route'
import ZonesAccesRoute from './routes/zones-acces.route'
import PermissionRoute from './routes/permission.route'
import ConfigurationRoute from './routes/configuration.route'
import AccessRoute from './routes/access.route'
import statsRoutes from './routes/stats.route';
import SessionAdminRoute from './routes/session-admin.route';

export const app = express();

// Configuration pour récupérer l'IP réelle du client
app.set('trust proxy', true); // Fait confiance aux en-têtes de proxy
app.use(express.json()); // 👈 nécessaire pour parser le JSON

/*
 * Routes
 */
app.use('/api/auth',AuthRoute);  
app.use('/api/users', UserRoute); 
app.use('/api/roles', RoleRoute); 
app.use('/api/badges', BadgeRoute); 
app.use('/api/devices', DeviceRoute);
app.use('/api/access-logs', AccessLogRoute);
app.use('/api/alerts', AlertRoute);
app.use('/api/zones-acces', ZonesAccesRoute);
app.use('/api/permissions', PermissionRoute);
app.use('/api/configuration', ConfigurationRoute);
app.use('/api/access', AccessRoute)
app.use('/api/stats', statsRoutes); 
app.use('/api/sessions-admin', SessionAdminRoute);

