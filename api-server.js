const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { auth } = require("express-oauth2-jwt-bearer");
const authConfig = require("./src/auth_config.json");
const apiConfig = require("./api_config.json")
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const crypto = require("crypto");


const app = express();

const port = 4001;
const appPort = 4000;
const appOrigin = authConfig.appOrigin || `http://localhost:${appPort}`;

if (
  !authConfig.domain ||
  !authConfig.audience ||
  authConfig.audience === "YOUR_API_IDENTIFIER"
) {
  console.log(
    "Exiting: Please make sure that auth_config.json is in place and populated with valid domain and audience values"
  );

  process.exit();
}

const db = new sqlite3.Database('./db.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

var jsonParser = bodyParser.json()

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: appOrigin }));

const checkJwt = auth({
  audience: authConfig.audience,
  issuerBaseURL: `https://${authConfig.domain}/`,
  algorithms: ["RS256"],
});

app.post("/api/1/homes", checkJwt, jsonParser, (req, res) => {
  var username = req.auth.payload.sub;
  var home_name = req.body.name;
  var bucket_id = "";
  var bucket_token = "";
  var loxone_token = crypto.randomBytes(10).toString("base64url");

  const regex = /^[\p{Letter}\p{Mark}0-9 _]*$/gu;
  const found = home_name.match(regex);
  if (!found) {
    res.send('Povolené znaky jsou pouze malá a velká písmena, čísla, mezera a podtržítko.');
    return;
  }

  var cmd = `influx bucket create --json -o grafana --name '${home_name}' --token ${apiConfig.influx_token}`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    var data = JSON.parse(stdout);
    bucket_id = data.id;

    cmd = `influx auth create --json -o grafana --read-bucket ${bucket_id} -d '${home_name}' --token ${apiConfig.influx_token}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        res.send('Internal server error');
        return;
      }
      var data = JSON.parse(stdout);
      bucket_token = data.token;
      bucket_auth_id = data.id

      const sql = 'INSERT INTO homes(username, name, bucket_id, bucket_token, bucket_auth_id, loxone_token) VALUES (?, ?, ?, ?, ?, ?)';
      db.run(sql, [username, home_name, bucket_id, bucket_token, bucket_auth_id, loxone_token], function(err) {
        if (err) {
          console.error(err.message);
          res.send('Internal server error');
          return;
        }
        res.send({
          msg: "Home created.",
        });
      });
    });
  });
});


app.delete("/api/1/homes/:home_name", checkJwt, jsonParser, (req, res) => {
  var username = req.auth.payload.sub;
  const { home_name } = req.params;

  db.get('SELECT * FROM homes WHERE name = ? AND username = ?', [home_name, username], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
      return
    } else if (!row) {
      res.status(404).send('Home not found');
      return
    }

    var cmd = `influx bucket delete --json --id ${row.bucket_id} --token ${apiConfig.influx_token}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }

      cmd = `influx auth delete --json -i ${row.bucket_auth_id} --token ${apiConfig.influx_token}`;
      exec(cmd, (err, stdout, stderr) => {

        if (err) {
          console.error(err);
          return;
        }

        const sql = 'DELETE FROM homes WHERE name = ? AND username = ?';
        db.run(sql, [home_name, username], function(err) {
          if (err) {
            console.error(err.message);
            res.send('Internal server error');
            return;
          }
          res.send({
            msg: "Home removed.",
          });
        });
      });
    });

  });


});


app.get("/api/1/homes_by_username/:username", checkJwt, jsonParser, (req, res) => {
  const { username } = req.params;

  db.all('SELECT * FROM homes WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
    } else if (!rows) {
      res.status(404).send('Homes not found');
    } else {
      res.send(rows);
    }
  });
});


app.listen(port, () => console.log(`API Server listening on port ${port}`));
