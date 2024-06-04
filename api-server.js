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

const grafana_url = 'http://localhost:3000'

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

function influx_api(cmd, res) {
    try {
      stdout = execSync(cmd);
      return stdout;
    }
    catch (err){
      console.log("output", err);
      console.log("stderr", err.stderr.toString());
      if (!res) {
        return ""
      }

      if (err.stderr.toString().includes("already exists")) {
        res.send({msg: 'Dům s tímto jménem již existuje. Zvolte jiné jméno.'});
      }
      else {
        res.send({msg: 'Internal server error'});
      }
      return "";
    }
}

function import_dashboards(res) {
    try {
      stdout = execSync("cd dashboard; python3 import.py");
      return stdout;
    }
    catch (err){
      console.log("output", err);
      console.log("stderr", err.stderr.toString());
      if (!res) {
        return ""
      }

      res.send({msg: 'Internal server error'});
      return "";
    }
}

async function grafana_api(method, api, data=null, orgId=null) {
  var options = {
    json: true,
    username: apiConfig.grafana_username,
    password: apiConfig.grafana_password,
    rejectUnauthorized: false
  }
  if (orgId) {
    options.headers = {"X-Grafana-Org-Id": orgId};
  }
  var resp = await needle(method, `${grafana_url}${api}`, data, options);
  console.log(resp.body);
  return resp;
}

app.post("/api/1/homes", checkJwt, jsonParser, async (req, res) => {
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
    res.send({msg:'Povolené znaky pro Jméno domu jsou pouze malá a velká písmena, čísla, mezera a podtržítko.'});
    return;
  }

  // Create InfluxDB Bucket.
  stdout = influx_api(
    `influx bucket create --json -o grafana --name '${home_name}' --token ${apiConfig.influx_token}`,
    res
  );
  if (!stdout) {
    return;
  }
  var data = JSON.parse(stdout);
  bucket_id = data.id;

  // Create InfluxDB auth token for reading the bucket.
  stdout = influx_api(
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
  var resp = await grafana_api('post', '/api/orgs/', {name: home_name});
  if (resp.body.message == "Organization name taken") {
    influx_api(
      `influx bucket delete --json --id ${bucket_id} --token ${apiConfig.influx_token}`,
      null
    );
    influx_api(
      `influx auth delete --json -i ${bucket_auth_id} --token ${apiConfig.influx_token}`,
      null
    );
  res.send({msg:'Dům s tímto jménem již existuje. Zvolte jiné jméno.'});
  }
  var orgId = resp.body.orgId;

  // Create Grafana user.
  var data = {
    name: grafana_username,
    email: grafana_username,
    login: grafana_username,
    password: grafana_password,
    OrgId: orgId
  };
  var resp = await grafana_api('post', `/api/admin/users`, data);
  if (resp.body.message == "Password is missing or too short") {
      influx_api(
        `influx bucket delete --json --id ${bucket_id} --token ${apiConfig.influx_token}`,
        null
      );
      influx_api(
        `influx auth delete --json -i ${bucket_auth_id} --token ${apiConfig.influx_token}`,
        null
      );
      await grafana_api('delete', `/api/orgs/${orgId}`);
    res.send({msg:'Heslo je příliš krátké.'});
    return;
  }
  else if (resp.body.message.includes("already exists")) {
      influx_api(
        `influx bucket delete --json --id ${bucket_id} --token ${apiConfig.influx_token}`,
        null
      );
      influx_api(
        `influx auth delete --json -i ${bucket_auth_id} --token ${apiConfig.influx_token}`,
        null
      );
      await grafana_api('delete', `/api/orgs/${orgId}`);
    res.send({msg:'Uživatel s tímto jménem již existuje. Zvolte jiné Uživatelské jméno.'});
    return;
  }
  var userId = resp.body.id;

  // Add Grafana user to organization.
  var data = {
    loginOrEmail: grafana_username,
    role: "Editor"
  };
  var resp = await grafana_api('post', `/api/orgs/${orgId}/users`, data);

  // Set user's role to Editor. This in theory should not be needed,
  // but there is probably some bug in Grafana's user creation API.
  var data = {
    "role": "Editor"
  }
  var resp = await grafana_api('patch', `/api/orgs/${orgId}/users/${userId}`, data);
  console.log(resp.body);

  // Create influxdb Grafana datasource in the organization.
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
  var resp = await grafana_api('post', `/api/datasources`, data, orgId);
  console.log(resp.body);

  var stdout = import_dashboards(res)
  if (!stdout) {
    return;
  }

  // Insert all the data to database.
  const sql = 'INSERT INTO homes(username, name, bucket_id, bucket_token, bucket_auth_id, loxone_token, grafana_org_id, grafana_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.run(sql, [username, home_name, bucket_id, bucket_token, bucket_auth_id, loxone_token, orgId, userId], function(err) {
    if (err) {
      console.error(err.message);
      res.send('Internal server error');
      return;
    }
    res.send({
      msg: "",
    });
  });
});


app.delete("/api/1/homes/:home_name", checkJwt, jsonParser, async (req, res) => {
  var username = req.auth.payload.sub;
  const { home_name } = req.params;

  db.get('SELECT * FROM homes WHERE name = ? AND username = ?', [home_name, username], async (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
      return
    } else if (!row) {
      res.status(404).send('Home not found');
      return
    }

    influx_api(
      `influx bucket delete --json --id ${row.bucket_id} --token ${apiConfig.influx_token}`,
      null
    );
    influx_api(
      `influx auth delete --json -i ${row.bucket_auth_id} --token ${apiConfig.influx_token}`,
      null
    );

    await grafana_api('delete', `/api/admin/users/${row.grafana_user_id}`);
    await grafana_api('delete', `/api/orgs/${row.grafana_org_id}`);

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



app.get("/api/1/homes/:homeId", checkJwt, jsonParser, (req, res) => {
  const { homeId } = req.params;
  var username = req.auth.payload.sub;

  db.all('SELECT * FROM homes WHERE id = ? AND username = ?', [homeId, username], (err, rows) => {
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


app.post("/api/1/homes/:homeId/notifications/", checkJwt, jsonParser, async (req, res) => {
  var username = req.auth.payload.sub;
  const { homeId } = req.params;

  db.all('SELECT * FROM homes WHERE id = ? AND username = ?', [homeId, username], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send({msg: 'Internal Server Error'});
      return;
    } else if (!rows) {
      res.status(404).send({msg: 'Dům neexituje'})
      return;
    }

    var type = req.body.type;
    var value = req.body.value;

    if (type == "sms"){
      const regex = /\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/gu;
      const found = value.match(regex);
      if (!found) {
        res.send({msg:'Telefonní číslo je neplatné nebo není v mezinárodním formátu.'});
        return;
      }

    }
    else if (type == "email") {

    }
    else {
      res.send({msg:'Notifikace lze zasílat jen pomocí SMS nebo emailu.'});
      return;
    }

    const sql = 'INSERT INTO notifications(grafana_org_id, type, value) VALUES (?, ?, ?)';
    db.run(sql, [rows[0].grafana_org_id, type, value], function(err) {
      if (err) {
        console.error(err.message);
        res.send('Internal server error');
        return;
      }
      res.send({
        msg: "",
      });
    });
  });
});


app.get("/api/1/homes/:homeId/notifications", checkJwt, jsonParser, (req, res) => {
  const { homeId } = req.params;
  var username = req.auth.payload.sub;

  db.all('SELECT * FROM homes WHERE id = ? AND username = ?', [homeId, username], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send({msg: 'Internal Server Error'});
      return;
    } else if (!rows) {
      res.status(404).send({msg: 'Dům neexituje'})
      return;
    }

    db.all('SELECT * FROM notifications WHERE grafana_org_id = ?', [rows[0].grafana_org_id], (err, rows) => {
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
});


app.delete("/api/1/homes/:homeId/notifications/:n_id", checkJwt, jsonParser, (req, res) => {
  const { homeId, n_id } = req.params;
  var username = req.auth.payload.sub;

  db.all('SELECT * FROM homes WHERE id = ? AND username = ?', [homeId, username], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send({msg: 'Internal Server Error'});
      return;
    } else if (!rows) {
      res.status(404).send({msg: 'Dům neexituje'})
      return;
    }

    const sql = 'DELETE FROM notifications WHERE id = ?';
    db.run(sql, [n_id], function(err) {
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

app.listen(port, () => console.log(`API Server listening on port ${port}`));
