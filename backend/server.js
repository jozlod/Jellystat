require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const createdb = require('./create_database');
const knexConfig = require('./migrations');

const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const proxyRouter = require('./routes/proxy');
const syncRouter = require('./routes/sync');
const statsRouter = require('./routes/stats');
const backupRouter = require('./routes/backup');
const ActivityMonitor = require('./tasks/ActivityMonitor');
const SyncTask = require('./tasks/SyncTask');
const BackupTask = require('./tasks/BackupTask');
const logRouter = require('./routes/logging');
const utilsRouter = require('./routes/utils');

const dbInstance = require('./db');

// set up public folder for static files
const root = path.join(__dirname, '..', 'dist');

const http = require('http');
const { setupWebSocketServer } = require('./ws');

const app = express();
const db = knex(knexConfig.development);

const PORT = process.env.PORT || 3003;
const LISTEN_IP = '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET === undefined) {
  console.log('JWT Secret cannot be undefined');
  process.exit(1); // end the program with error status code
}

// middlewares
app.use(express.json()); // middleware to parse JSON request bodies
app.set('trust proxy', 1);
app.disable('x-powered-by');

// for deployment
app.use(express.static(root));

const server = http.createServer(app);
setupWebSocketServer(server);
app.use(cors());

// JWT middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization;
  const apiKey = req.headers['x-api-token'] || req.query.apiKey;

  if (!token && !apiKey) {
    return res.status(401).json({
      message: 'Authentication failed. No token or API key provided.',
    });
  }

  if (token) {
    const extracted_token = token.split(' ')[1];
    if (!extracted_token || extracted_token === 'null') {
      return res.sendStatus(403);
    }

    try {
      const decoded = jwt.verify(extracted_token, JWT_SECRET);
      req.user = decoded.user;
      next();
    } catch (error) {
      console.log(error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    if (apiKey) {
      const keysjson = await dbInstance
        .query('SELECT api_keys FROM app_config where "ID"=1')
        .then((res) => res.rows[0].api_keys);

      if (!keysjson || Object.keys(keysjson).length === 0) {
        return res.status(404).json({ message: 'No API keys configured' });
      }
      const keys = keysjson || [];

      const keyExists = keys.some((obj) => obj.key === apiKey);

      if (keyExists) {
        next();
      } else {
        return res.status(403).json({ message: 'Invalid API key' });
      }
    }
  }
}

app.use('/auth', authRouter, () => {
  /*  #swagger.tags = ['Auth'] */
}); // mount the API router at /auth
app.use('/proxy', proxyRouter, () => {
  /*  #swagger.tags = ['Proxy']*/
}); // mount the API router at /proxy
app.use('/api', authenticate, apiRouter, () => {
  /*  #swagger.tags = ['API']*/
}); // mount the API router at /api, with JWT middleware
app.use('/sync', authenticate, syncRouter.router, () => {
  /*  #swagger.tags = ['Sync']*/
}); // mount the API router at /sync, with JWT middleware
app.use('/stats', authenticate, statsRouter, () => {
  /*  #swagger.tags = ['Stats']*/
}); // mount the API router at /stats, with JWT middleware
app.use('/backup', authenticate, backupRouter.router, () => {
  /*  #swagger.tags = ['Backup']*/
}); // mount the API router at /backup, with JWT middleware
app.use('/logs', authenticate, logRouter.router, () => {
  /*  #swagger.tags = ['Logs']*/
}); // mount the API router at /logs, with JWT middleware
app.use('/utils', authenticate, utilsRouter, () => {
  /*  #swagger.tags = ['Utils']*/
}); // mount the API router at /utils, with JWT middleware

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// for use in deployment
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

try {
  createdb.createDatabase().then((result) => {
    if (result) {
      console.log(result);
      console.log('Database created');
    }

    db.migrate.latest().then(() => {
      server.listen(PORT, async () => {
        console.log(`Server listening on http://${LISTEN_IP}:${PORT}`);

        ActivityMonitor.ActivityMonitor(1000);
        SyncTask.SyncTask();
        BackupTask.BackupTask();
      });
    });
  });
} catch (error) {
  console.log('An error has occured on startup: ' + error);
}
