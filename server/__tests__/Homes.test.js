import request from 'supertest';
import express from 'express';
import {router} from '../routes/Main.js';
import {Database} from '../db.js';
const {grafana_api, influx_api, import_dashboards} = require("../utils.js");
import * as routesApi from '../routes/Main.js';
const bodyParser = require('body-parser')
const apiConfig = require("../../api_config.json");

const app = new express();
app.use('/', router);
app.use(bodyParser.json());

jest.mock('../utils', () => ({
  grafana_api: jest.fn(),
  influx_api: jest.fn(),
  import_dashboards: jest.fn(),
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

describe("The Homes API", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.create_tables();
    app.set('db', db);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  it("gets home - home does not exist", async () => {
    const res = await request(app).get('/api/1/homes/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("gets home", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    const res = await request(app).get('/api/1/homes/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      "bucket_auth_id": "b_auth_id",
      "bucket_id": "b_id",
      "bucket_token": "b_token",
      "grafana_org_id": "2",
      "grafana_user_id": "2",
      "id": 1,
      "loxone_token": "l_token",
      "name": "Test",
      "username": "auth0|deadbeef"
    });
  });

  it("gets homes - no home", async () => {
    const res = await request(app).get('/api/1/homes')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"data": []});
  });

  it("gets homes", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    db.add_home("auth0|deadbeef2", "Test2", "b_id", "b_token", "b_auth_id", "l_token", 3, 3);
    const res = await request(app).get('/api/1/homes')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      "data": [{
        "bucket_auth_id": "b_auth_id",
        "bucket_id": "b_id",
        "bucket_token": "b_token",
        "grafana_org_id": "2",
        "grafana_user_id": "2",
        "id": 1,
        "loxone_token": "l_token",
        "name": "Test",
        "username": "auth0|deadbeef"
      }]
    });
  });

  it("deletes home - home does not exist", async () => {
    const res = await request(app).delete('/api/1/homes/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({"msg": "Dům neexistuje"});
  });

  it("deletes home", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    influx_api.mockReturnValue({});
    grafana_api.mockReturnValue("ok");
    const res = await request(app).delete('/api/1/homes/1')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});

    expect(influx_api.mock.calls[0]).toEqual([
      `influx bucket delete --json --id b_id --token ${apiConfig.influx_token}`
    ]);
    expect(influx_api.mock.calls[1]).toEqual([
      `influx auth delete --json -i b_auth_id --token ${apiConfig.influx_token}`
    ]);

    expect(grafana_api.mock.calls[0]).toEqual([
      "delete", "/api/admin/users/2"
    ]);
    expect(grafana_api.mock.calls[1]).toEqual([
      "delete", "/api/orgs/2"
    ]);

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);
  });

  it("creates homes - not allowed characters", async () => {
    var payload = {
      name: "Test;",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Povolené znaky pro Jméno domu jsou pouze malá a velká písmena, čísla, mezera a podtržítko."});
  });

  it("creates homes", async () => {
    influx_api
      .mockReturnValueOnce({id: "10"})
      .mockReturnValueOnce({id: "20", token: "token"});
    grafana_api
      .mockReturnValueOnce({body: {message: "Organization created.", orgId: 2}})
      .mockReturnValueOnce({body: {message: "User Created.", id: 5}})
      .mockReturnValueOnce({body: {message: "User added to org."}})
      .mockReturnValueOnce({body: {message: "User granted Editor."}})
      .mockReturnValueOnce({body: {message: "Datasource created."}});

    import_dashboards
      .mockReturnValueOnce({})

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": ""});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(Object.hasOwn(home, "loxone_token")).toEqual(true);
    delete home.loxone_token;
    expect(home).toEqual({
      "bucket_auth_id": "20",
      "bucket_id": "10",
      "bucket_token": "token",
      "grafana_org_id": "2",
      "grafana_user_id": "5",
      "id": 1,
      "name": "Test",
      "username": "auth0|deadbeef"
    });

    expect(influx_api.mock.calls[0]).toEqual([
      `influx bucket create --json -o grafana --name 'Test' --token ${apiConfig.influx_token}`
    ]);
    expect(influx_api.mock.calls[1]).toEqual([
      `influx auth create --json -o grafana --read-bucket 10 -d 'Test' --token ${apiConfig.influx_token}`
    ]);

    expect(grafana_api.mock.calls[0]).toEqual([
      "post", "/api/orgs/", {name: "Test"}
    ]);
    expect(grafana_api.mock.calls[1]).toEqual([
      "post", "/api/admin/users",
      {
        "OrgId": 2,
          "email": "user",
          "login": "user",
          "name": "user",
          "password": "pass",
      }
    ]);
    expect(grafana_api.mock.calls[2]).toEqual([
      "post", "/api/orgs/2/users",
      {
        "loginOrEmail": "user",
        "role": "Editor",
      }
    ]);
    expect(grafana_api.mock.calls[3]).toEqual([
      "patch", "/api/orgs/2/users/5",
      {
        "role": "Editor",
      }
    ]);
    expect(grafana_api.mock.calls[4]).toEqual([
      "post", "/api/datasources",
      {
        "access": "proxy",
        "jsonData": {
          "defaultBucket": "Test",
          "organization": "grafana",
          "tlsSkipVerify": true,
          "version": "Flux"
        },
        "name": "InfluxDB Test",
        "orgId": 2,
        "secureJsonData": {
          "token": "token",
        },
        "type": "influxdb",
        "url": "http://localhost:8086",
      },
      2
    ]);

    expect(import_dashboards.mock.calls[0]).toEqual(["Test"]);
  });

  it("creates homes - influx bucket create fails", async () => {
    influx_api
      .mockReturnValueOnce({msg: "Internal server error"})

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Internal server error"});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);
  });

  it("creates homes - influx auth create fails", async () => {
    influx_api
      .mockReturnValueOnce({id: "10"})
      .mockReturnValueOnce({msg: "Internal server error"})

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Internal server error"});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);

    expect(influx_api.mock.calls[2]).toEqual([
      `influx bucket delete --json --id 10 --token ${apiConfig.influx_token}`
    ]);
  });

  it("creates homes - grafana Organization name taken", async () => {
    influx_api
      .mockReturnValueOnce({id: "10"})
      .mockReturnValueOnce({id: "20", token: "token"});
    grafana_api
      .mockReturnValueOnce({body: {message: "Organization name taken", orgId: 2}});

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Dům s tímto jménem již existuje. Zvolte jiné jméno."});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);

    expect(influx_api.mock.calls[2]).toEqual([
      `influx bucket delete --json --id 10 --token ${apiConfig.influx_token}`
    ]);
    expect(influx_api.mock.calls[3]).toEqual([
      `influx auth delete --json -i 20 --token ${apiConfig.influx_token}`
    ]);
  });

  it.each([
    ["Password is missing or too short", "Heslo je příliš krátké."],
    ["User Test already exists", "Uživatel s tímto jménem již existuje. Zvolte jiné Uživatelské jméno."]
  ])("creates homes - grafana %p", async (msg, expected_msg) => {
    influx_api
      .mockReturnValueOnce({id: "10"})
      .mockReturnValueOnce({id: "20", token: "token"});
    grafana_api
      .mockReturnValueOnce({body: {message: "Organization created.", orgId: 2}})
      .mockReturnValueOnce({body: {message: msg, id: 5}})

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": expected_msg});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);

    expect(influx_api.mock.calls[2]).toEqual([
      `influx bucket delete --json --id 10 --token ${apiConfig.influx_token}`
    ]);
    expect(influx_api.mock.calls[3]).toEqual([
      `influx auth delete --json -i 20 --token ${apiConfig.influx_token}`
    ]);
    expect(grafana_api.mock.calls[2]).toEqual([
      "delete", "/api/orgs/2"
    ]);
  });

  it("creates homes - import dashboards fails", async () => {
    influx_api
      .mockReturnValueOnce({id: "10"})
      .mockReturnValueOnce({id: "20", token: "token"});
    grafana_api
      .mockReturnValueOnce({body: {message: "Organization created.", orgId: 2}})
      .mockReturnValueOnce({body: {message: "User Created.", id: 5}})
      .mockReturnValueOnce({body: {message: "User added to org."}})
      .mockReturnValueOnce({body: {message: "User granted Editor."}})
      .mockReturnValueOnce({body: {message: "Datasource created."}});

    import_dashboards
      .mockReturnValueOnce({"msg": "Internal server error"});

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Internal server error"});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);

    expect(influx_api.mock.calls[2]).toEqual([
      `influx bucket delete --json --id 10 --token ${apiConfig.influx_token}`
    ]);
    expect(influx_api.mock.calls[3]).toEqual([
      `influx auth delete --json -i 20 --token ${apiConfig.influx_token}`
    ]);
    expect(grafana_api.mock.calls[5]).toEqual([
      "delete", "/api/admin/users/5"
    ]);
    expect(grafana_api.mock.calls[6]).toEqual([
      "delete", "/api/orgs/2"
    ]);

    expect(import_dashboards.mock.calls[0]).toEqual(["Test"]);
  });

  it("creates homes - exception", async () => {
    influx_api.mockImplementation(() => {
      throw new Error("expected exception");
    });

    var payload = {
      name: "Test",
      grafana_username: "user",
      grafana_password: "pass"
    };
    const res = await request(app)
      .post('/api/1/homes')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({"msg": "Internal server error"});

    var home = db.get_home(1, "auth0|deadbeef");
    expect(home).toEqual(undefined);
  });

});
