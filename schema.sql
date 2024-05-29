CREATE TABLE homes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  bucket_id TEXT NOT NULL,
  bucket_token TEXT NOT NULL,
  bucket_auth_id TEXT NOT NULL,
  loxone_token TEXT NOT NULL,
  grafana_org_id TEXT NOT NULL
);
