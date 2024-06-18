import request from 'supertest';
import express from 'express';
import {router} from '../routes/Main.js';
import {Database} from '../db.js';
import {grafana_api} from "../utils.js"
import * as routesApi from '../routes/Main.js';
const bodyParser = require('body-parser')

const app = new express();
app.use('/', router);
app.use(bodyParser.json());

jest.mock('../utils', () => ({
  grafana_api: jest.fn(),
}));

jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: () => (req, res, next) => {
    req.auth = {
      payload: {
        sub: "auth0|deadbeef"
      }
    }
    next();
  }
}));

var db;

describe("The Notifications API", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.create_tables();
    app.set('db', db);
  });

  it("creates notification - home does not exist", async () => {
    var payload = {
      type: "sms",
      value: "+420608175227"
    };
    const res = await request(app)
      .post('/api/1/homes/1/notifications/')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("creates notification - wrong sms number", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    var payload = {
      type: "sms",
      value: "+420a608175227"
    };
    const res = await request(app)
      .post('/api/1/homes/1/notifications/')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Telefonní číslo je neplatné nebo není v mezinárodním formátu."});
  });

  it("creates notification - unknown notification type", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    var payload = {
      type: "something",
      value: "+420a608175227"
    };
    const res = await request(app)
      .post('/api/1/homes/1/notifications/')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Notifikace lze zasílat jen pomocí SMS nebo emailu."});
  });

  it.each([
    ["sms", "+420608175227"],
    ["email", "foo@bar.cz"],
  ])("creates notification - %p", async (type, value) => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    var payload = {
      type: type,
      value: value
    };
    const res = await request(app)
      .post('/api/1/homes/1/notifications/')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});

    var notifications = db.get_notifications(2);
    expect(notifications).toEqual([
      {
        "grafana_org_id": "2",
        "id": 1,
        "message_types": "",
        "type": type,
        "value": value
      }
    ]);
  });

  it("gets notifications - home does not exist", async () => {
    const res = await request(app).get('/api/1/homes/1/notifications/')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("gets notifications - empty message types", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    db.add_notification(2, "email", "foo@bar.cz");
    const res = await request(app).get('/api/1/homes/1/notifications/')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      {
        "grafana_org_id": "2",
        "id": 1,
        "message_types": [],
        "type": "email",
        "value": "foo@bar.cz"
      }
    ]);
  });

  it("gets notifications", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    db.add_notification(2, "email", "foo@bar.cz");
    db.update_notification(2, 1, "alerts,reports")
    const res = await request(app).get('/api/1/homes/1/notifications/')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      {
        "grafana_org_id": "2",
        "id": 1,
        "message_types": ["alerts", "reports"],
        "type": "email",
        "value": "foo@bar.cz"
      }
    ]);
  });

  it("updates notification - home does not exist", async () => {
    var payload = {
      message_types: ["alerts", "reports"]
    };
    const res = await request(app)
      .patch('/api/1/homes/1/notifications/1')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("updates notification - notification does not exist", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    var payload = {
      message_types: ["alerts", "reports"]
    };
    const res = await request(app)
      .patch('/api/1/homes/1/notifications/1')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});
  });

  it("updates notification", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    db.add_notification(2, "email", "foo@bar.cz");
    var payload = {
      message_types: ["alerts", "reports"]
    };
    const res = await request(app)
      .patch('/api/1/homes/1/notifications/1')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});

    var notifications = db.get_notifications(2);
    expect(notifications).toEqual([
      {
        "grafana_org_id": "2",
        "id": 1,
        "message_types": "alerts,reports",
        "type": "email",
        "value": "foo@bar.cz"
      }
    ]);
  });

  it("deletes notification - home does not exist", async () => {
    const res = await request(app).delete('/api/1/homes/1/notifications/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("deletes notification - notification does not exist", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    const res = await request(app).delete('/api/1/homes/1/notifications/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});
  });

  it("deletes notification", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    db.add_notification(2, "email", "foo@bar.cz");
    const res = await request(app).delete('/api/1/homes/1/notifications/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});

    var notifications = db.get_notifications(2);
    expect(notifications).toEqual([]);
  });
});
