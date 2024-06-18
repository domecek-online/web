const apiConfig = require("../api_config.json");
const needle = require('needle');
const { execSync } = require('child_process');

const grafana_url = 'http://localhost:3000';

async function grafana_api(method, api, data=null, orgId=null) {
  var options = {
    json: true,
    username: apiConfig.grafana_username,
    password: apiConfig.grafana_password,
    rejectUnauthorized: false
  }
  console.log(orgId);
  if (orgId) {
    options.headers = {"X-Grafana-Org-Id": orgId};
  }
  console.log(options);
  var resp = await needle(method, `${grafana_url}${api}`, data, options);
  console.log(resp.body);
  return resp;
}


function influx_api(cmd) {
    try {
      stdout = execSync(cmd);
      return JSON.parse(stdout);
    }
    catch (err) {
      console.log("output", err);
      console.log("stderr", err.stderr.toString());

      if (err.stderr.toString().includes("already exists")) {
        return {msg: 'Dům s tímto jménem již existuje. Zvolte jiné jméno.'};
      }
      else {
        return {msg: 'Internal server error'};
      }
    }
}

function import_dashboards(res, home_name) {
    try {
      stdout = execSync(`cd dashboard; python3 import.py '${home_name}'`);
      return {};
    }
    catch (err){
      console.log("output", err);
      console.log("stderr", err.stderr.toString());
      return {msg: 'Internal server error'};
    }
}


module.exports = {grafana_api, influx_api, import_dashboards};
