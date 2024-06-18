const {grafana_api} = require("../utils.js");

async function get_public_dashboards(req, res) {
  const db = req.app.get('db');
  var homes = db.get_homes();
  var ret = {};
  for (const home of homes) {
    var resp = await grafana_api('get', '/api/dashboards/public-dashboards', null, home["grafana_org_id"]);
    if (resp.body["publicDashboards"].length != 0) {
      ret[home["name"]] = resp.body["publicDashboards"];
    }
  }
  res.send(ret);
}


module.exports = {get_public_dashboards};
