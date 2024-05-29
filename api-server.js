const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { auth } = require("express-oauth2-jwt-bearer");
const authConfig = require("./src/auth_config.json");
const apiConfig = require("./api_config.json")
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');
const crypto = require("crypto");
var needle = require('needle');


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

function exec(cmd, res) {
    try {
      stdout = execSync(cmd);
      return stdout;
    }
    catch (err){
      console.log("output", err);
      console.log("stderr",err.stderr.toString());
      if (res) {
        res.send('Internal server error');
      }
      return "";
    }
}

app.post("/api/1/homes", checkJwt, jsonParser, (req, res) => {
  var username = req.auth.payload.sub;
  var home_name = req.body.name;
  var grafana_username = req.body.grafana_username;
  var grafana_password = req.body.grafana_password;
  var bucket_id = "";
  var bucket_token = "";
  var loxone_token = crypto.randomBytes(10).toString("base64url");

  // Enable only letters, numbers, underscore and white-space.
  const regex = /^[\p{Letter}\p{Mark}0-9 _]*$/gu;
  const found = home_name.match(regex);
  if (!found) {
    res.send('Povolené znaky jsou pouze malá a velká písmena, čísla, mezera a podtržítko.');
    return;
  }

  // Create InfluxDB Bucket.
  stdout = exec(
    `influx bucket create --json -o grafana --name '${home_name}' --token ${apiConfig.influx_token}`,
    res
  );
  if (!stdout) {
    return;
  }
  var data = JSON.parse(stdout);
  bucket_id = data.id;

  // Create InfluxDB auth token for reading the bucket.
  stdout = exec(
    `influx auth create --json -o grafana --read-bucket ${bucket_id} -d '${home_name}' --token ${apiConfig.influx_token}`,
    res
  );
  if (!stdout) {
    return;
  }
  var data = JSON.parse(stdout);
  bucket_token = data.token;
  bucket_auth_id = data.id

  // Create Grafana organization.
  var options = {
    json: true,
    username: apiConfig.grafana_username,
    password: apiConfig.grafana_password
  }
  needle.post('http://grafana.domecek.online/api/orgs/', { name: home_name}, options, function(err, resp) {
    console.log(err);
    console.log(resp.body);
    var orgId = resp.body.orgId;
    var data = {
      name: grafana_username,
      email: grafana_username,
      login: grafana_username,
      password: grafana_password,
      OrgId: orgId
    };
    needle.post('http://grafana.domecek.online/api/admin/users', data, options, function(err, resp) {
      console.log(err);
      console.log(resp.body);
      var userId = resp.body.id;
      var data = {
        loginOrEmail: grafana_username,
        role: "Editor"
      };
      needle.post(`http://grafana.domecek.online/api/orgs/${orgId}/users`, data, options, function(err, resp) {
        console.log(err);
        console.log(resp.body);

        var data = {
          "role": "Editor"
        }
        needle.patch(`http://grafana.domecek.online/api/orgs/${orgId}/users/${userId}`, data, options, function(err, resp) {
          console.log(err);
          console.log(resp.body);
        });

        options.headers = {"X-Grafana-Org-Id": orgId};
        var data = {
          orgId: orgId,
          name: `InfluxDB ${home_name}`,
          type: "influxdb",
          access: "proxy",
          url: "http://localhost:8086",
          jsonData: {
            version: "Flux",
            organization: "grafana",
            defaultBucket: home_name,
            tlsSkipVerify: true
          },
          secureJsonData: {
            token: bucket_token
          }
        }
        console.log(orgId);
        needle.post(`http://grafana.domecek.online/api/datasources`, data, options, function(err, resp) {
          console.log(err);
          console.log(resp.body);
        });
      });
    });
  });

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

    exec(
      `influx bucket delete --json --id ${row.bucket_id} --token ${apiConfig.influx_token}`,
      null
    );
    exec(
      `influx auth delete --json -i ${row.bucket_auth_id} --token ${apiConfig.influx_token}`,
      null
    );

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
