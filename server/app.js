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

const grafana_url = 'http://localhost:3000'

const app = express();

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
