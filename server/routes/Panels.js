const path = require('node:path');
const fs = require('fs');
const apiConfig = require("../../api_config.json");

async function get_panels(req, res) {
  var username = req.auth.payload.sub;
  const { homeId } = req.params;
  const db = req.app.get('db');


  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  var ret = []
  var org_path = path.join(apiConfig.images_dir, home.grafana_org_id);
  var files = fs.readdirSync(org_path);
  for (var f of files) {
    if (!f.endsWith(".json")) {
      continue;
    }

    var file_path = path.join(org_path, f);
    const data = fs.readFileSync(file_path);
    var panel = JSON.parse(data);

    var img_fn = f.replace(".json", ".png");
    ret.push({
      url: `https://domecek.online/i/${home.grafana_org_id}/${img_fn}`,
      title: panel["title"]
    })
  }

  res.send(ret);
}


module.exports = {get_panels};
