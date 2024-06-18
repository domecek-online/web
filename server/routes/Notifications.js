async function create_notification(req, res) {
  var username = req.auth.payload.sub;
  const { homeId } = req.params;
  const db = req.app.get('db');

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
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

  db.add_notification(home.grafana_org_id, type, value);
  res.send({msg:''});
}


async function update_notification(req, res) {
  var username = req.auth.payload.sub;
  const { homeId, n_id } = req.params;
  var message_types = req.body.message_types;
  const db = req.app.get('db');

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  message_types = message_types.join(",");
  db.update_notification(home.grafana_org_id, n_id, message_types);
  res.send({msg: ""});
}


async function get_notifications(req, res) {
  const { homeId } = req.params;
  var username = req.auth.payload.sub;
  const db = req.app.get('db');

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  var ret = []
  var notifications = db.get_notifications(home.grafana_org_id);
  for (const n of notifications) {
    if (n.message_types) {
      n.message_types = n.message_types.split(",");
    }
    else {
      n.message_types = []
    }
    ret.push(n);
  }
  res.send(ret);
}


async function delete_notification(req, res) {
  const { homeId, n_id } = req.params;
  var username = req.auth.payload.sub;
  const db = req.app.get('db');

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  db.delete_notification(home.grafana_org_id, n_id)
  res.send({
    msg: "",
  });
}




module.exports = {delete_notification, update_notification, get_notifications, create_notification};
