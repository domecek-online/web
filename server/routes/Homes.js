const {grafana_api, influx_api, import_dashboards} = require("../utils.js");
const apiConfig = require("../../api_config.json");
const crypto = require("crypto");


async function delete_home_api_calls(bucket_id, bucket_auth_id, grafana_org_id, grafana_user_id) {
  if (bucket_id) {
    influx_api(
      `influx bucket delete --json --id ${bucket_id} --token ${apiConfig.influx_token}`
    );
  }

  if (bucket_auth_id) {
    influx_api(
      `influx auth delete --json -i ${bucket_auth_id} --token ${apiConfig.influx_token}`
    );
  }

  if (grafana_user_id) {
    await grafana_api('delete', `/api/admin/users/${grafana_user_id}`);
  }

  if (grafana_org_id) {
    await grafana_api('delete', `/api/orgs/${grafana_org_id}`);
  }
}

async function create_home(req, res) {
  var username = req.auth.payload.sub;
  var home_name = req.body.name;
  var grafana_username = req.body.grafana_username;
  var grafana_password = req.body.grafana_password;
  var loxone_token = crypto.randomBytes(10).toString("base64url");
  const db = req.app.get('db');
  var bucket_id = undefined;
  var bucket_auth_id = undefined;
  var orgId = undefined;
  var userId = undefined;


  try {
    // Enable only letters, numbers, underscore and white-space.
    const regex = /^[\p{Letter}\p{Mark}0-9 _]*$/gu;
    const found = home_name.match(regex);
    if (!found) {
      res.send({msg:'Povolené znaky pro Jméno domu jsou pouze malá a velká písmena, čísla, mezera a podtržítko.'});
      return;
    }

    // Create InfluxDB Bucket.
    var data =  influx_api(
      `influx bucket create --json -o grafana --name '${home_name}' --token ${apiConfig.influx_token}`
    );
    if (data.hasOwnProperty("msg")) {
      res.send(data);
      return;
    }
    bucket_id = data.id;

    // Create InfluxDB auth token for reading the bucket.
    data = influx_api(
      `influx auth create --json -o grafana --read-bucket ${bucket_id} -d '${home_name}' --token ${apiConfig.influx_token}`
    );
    if (data.hasOwnProperty("msg")) {
      delete_home_api_calls(bucket_id);
      res.send(data);
      return;
    }
    var bucket_token = data.token;
    bucket_auth_id = data.id

    // Create Grafana organization.
    var resp = await grafana_api('post', '/api/orgs/', {name: home_name});
    if (resp.body.message == "Organization name taken") {
      delete_home_api_calls(bucket_id, bucket_auth_id);
      res.send({msg:'Dům s tímto jménem již existuje. Zvolte jiné jméno.'});
      return;
    }
    orgId = resp.body.orgId;

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
      delete_home_api_calls(bucket_id, bucket_auth_id, orgId);
      res.send({msg:'Heslo je příliš krátké.'});
      return;
    }
    else if (resp.body.message.includes("already exists")) {
      delete_home_api_calls(bucket_id, bucket_auth_id, orgId);
      res.send({msg:'Uživatel s tímto jménem již existuje. Zvolte jiné Uživatelské jméno.'});
      return;
    }
    userId = resp.body.id;

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

    var data = import_dashboards(home_name);
    if (data.hasOwnProperty("msg")) {
      delete_home_api_calls(bucket_id, bucket_auth_id, orgId, userId);
      res.send(data);
      return;
    }

    // Insert all the data to database.
    db.add_home(username, home_name, bucket_id, bucket_token, bucket_auth_id, loxone_token, orgId, userId)
    res.send({
      msg: "",
    });
  } catch (err) {
    console.log(err);
    delete_home_api_calls(bucket_id, bucket_auth_id, orgId, userId);
    res.send({
      msg: "Internal server error",
    });
  }
}


async function delete_home(req, res) {
  var username = req.auth.payload.sub;
  const { homeId } = req.params;
  const db = req.app.get('db');


  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  delete_home_api_calls(home.bucket_id, home.bucket_auth_id, home.grafana_org_id, home.grafana_user_id);

  db.delete_home(homeId);
  res.send({
    msg: "",
  });
}


function get_homes(req, res) {
  var username = req.auth.payload.sub;
  const db = req.app.get('db');

  var homes = db.get_homes(username);
  res.send({"data": homes});
}


function get_home(req, res) {
  const { homeId } = req.params;
  var username = req.auth.payload.sub;
  const db = req.app.get('db');

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  res.send(home);
}

module.exports = {get_home, create_home, delete_home, get_homes};
