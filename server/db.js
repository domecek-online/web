const fs = require('node:fs');
sqlite3 =  require('better-sqlite3');

class Database {
  constructor(db_path) {
    this.db = new sqlite3(db_path);
    this.db.pragma('journal_mode = WAL');
  }

  create_tables() {
    const schema = fs.readFileSync('schema.sql', 'utf8');
    this.db.exec(schema);
  }

  add_home(username, home_name, bucket_id, bucket_token, bucket_auth_id, loxone_token, orgId, userId) {
    const stmt = this.db.prepare('INSERT INTO homes(username, name, bucket_id, bucket_token, bucket_auth_id, loxone_token, grafana_org_id, grafana_user_id) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER))');
    stmt.run([username, home_name, bucket_id, bucket_token, bucket_auth_id, loxone_token, orgId, userId]);
  }

  get_homes() {
    const stmt = this.db.prepare('SELECT * FROM homes');
    return stmt.all()
  }

  get_home(id, username) {
    const stmt = this.db.prepare('SELECT * FROM homes WHERE id = ? AND username = ?');
    return stmt.get(id, username);
  }

  delete_home(id) {
    const stmt = this.db.prepare('DELETE FROM homes WHERE id = ?');
    stmt.run(id);
  }

  add_notification(grafana_org_id, type, value) {
    const stmt = this.db.prepare('INSERT INTO notifications(grafana_org_id, type, value) VALUES (CAST(? AS INTEGER), ?, ?)');
    stmt.run(grafana_org_id, type, value);
  }

  get_notifications(grafana_org_id) {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE grafana_org_id = CAST(? AS INTEGER)');
    return stmt.all(grafana_org_id);
  }

  update_notification(grafana_org_id, id, message_types) {
    const stmt = this.db.prepare('UPDATE notifications SET message_types=? WHERE id = ? AND grafana_org_id = CAST(? AS INTEGER)');
    stmt.run(message_types, id, grafana_org_id);
  }

  delete_notification(grafana_org_id, id) {
    const stmt = this.db.prepare("DELETE FROM notifications WHERE id = ? AND grafana_org_id = CAST(? AS INTEGER)");
    stmt.run(id, grafana_org_id);
  }
}

module.exports = {Database}
