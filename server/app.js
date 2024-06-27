require("./instrument.js");
const express = require("express");
const http = require("http");
const cors = require("cors");
const {router} = require('./routes/Main.js');
const morgan = require("morgan");
const helmet = require("helmet");
const authConfig = require("../src/auth_config.json");
const apiConfig = require("../api_config.json");
const sqlite3 = require('sqlite3').verbose();
const {Database} = require('./db.js');
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");


// Sentry.init({
//   dsn: "https://1e187b10b124fe5be05f85642e2b9b78@o4507392194969600.ingest.de.sentry.io/4507451490893904",
//   integrations: [
//     nodeProfilingIntegration(),
//   ],
//   // Performance Monitoring
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions

//   // Set sampling rate for profiling - this is relative to tracesSampleRate
//   profilesSampleRate: 1.0,
//   enabled: apiConfig.sentry_enabled,
// });


const grafana_url = 'http://localhost:3000'

const app = express();
Sentry.setupExpressErrorHandler(app);

const port = 4001;
const appPort = 4000;
const appOrigin = authConfig.appOrigin || `http://localhost:${appPort}`;

console.log(appOrigin);
app.use(cors({ origin: appOrigin }));
app.use('/', router);

app.set('port', port);
app.use(morgan("dev"));
app.use(helmet());


const db = new Database("db.db");

app.set('db', db);

const server = http.createServer(app);
server.listen(port);
