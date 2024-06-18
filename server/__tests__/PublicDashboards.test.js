import request from 'supertest';
import express from 'express';
import {router} from '../routes/Main.js';
import {Database} from '../db.js';
import {grafana_api} from "../utils.js"

const app = new express();
app.use('/', router);

jest.mock('../utils', () => ({
  grafana_api: jest.fn(),
}))

var db;

describe("The Public Dashboards API", () => {
  beforeEach(() => {
    db = new Database(":memory:");
    db.create_tables();
    app.set('db', db);
    grafana_api.mockReset();
  });

  it("no homes", async () => {
    const res = await request(app).get('/api/1/public_dashboards');
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });

  it("returns public dashboards", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    grafana_api.mockReturnValue({
      body: {
        publicDashboards: [
          {
            uid: 'ednxmm755urk0e',
            accessToken: '75931189a288473a88af2e56434658af',
            title: 'Elektřina',
            dashboardUid: '7ni-KDsIz',
            isEnabled: true,
            slug: 'elektrina'
          },
          {
            uid: 'ednxmn5spn4lcd',
            accessToken: '7798957785e04da5859970c708864532',
            title: 'Počasí',
            dashboardUid: 'fdnsvf1k9tvy8c',
            isEnabled: true,
            slug: 'pocasi'
          }
        ],
        totalCount: 2,
        page: 1,
        perPage: 1000
      }
    });

    const res = await request(app).get('/api/1/public_dashboards');
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      Test: [
        {
          uid: 'ednxmm755urk0e',
          accessToken: '75931189a288473a88af2e56434658af',
          title: 'Elektřina',
          dashboardUid: '7ni-KDsIz',
          isEnabled: true,
          slug: 'elektrina'
        },
        {
          uid: 'ednxmn5spn4lcd',
          accessToken: '7798957785e04da5859970c708864532',
          title: 'Počasí',
          dashboardUid: 'fdnsvf1k9tvy8c',
          isEnabled: true,
          slug: 'pocasi'
        }
      ]
    });
  });


  it("returns public dashboards - no dahsboards", async () => {
    db.add_home("auth0|deadbeef", "Test", "b_id", "b_token", "b_auth_id", "l_token", 2, 2);
    grafana_api.mockReturnValue({
      body: {
        publicDashboards: [],
        totalCount: 0,
        page: 1,
        perPage: 1000
      }
    });

    const res = await request(app).get('/api/1/public_dashboards');
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });
});
