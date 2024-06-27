const Router = require("express");
const homes = require('./Homes.js');
const notifications = require('./Notifications.js');
const public_dashboards = require('./PublicDashboards.js');
const panels = require('./Panels.js');
const ai = require('./AI.js');
const bodyParser = require('body-parser')
const authConfig = require("../../src/auth_config.json");
const { auth } = require("express-oauth2-jwt-bearer");

if (
  !authConfig.domain ||
  !authConfig.audience ||
  authConfig.audience === "YOUR_API_IDENTIFIER"
) {
  console.log(
    "Exiting: Please make sure that auth_config.json is in place and populated with valid domain and audience values"
  );

  process.exit();
}

const checkJwt = auth({
  audience: authConfig.audience,
  issuerBaseURL: `https://${authConfig.domain}/`,
  algorithms: ["RS256"],
});

var jsonParser = bodyParser.json()

const router = Router();


router.get("/api/1/homes/:homeId", checkJwt, jsonParser, homes.get_home);
router.get("/api/1/homes", checkJwt, jsonParser, homes.get_homes);
router.delete("/api/1/homes/:homeId", checkJwt, jsonParser, homes.delete_home);
router.post("/api/1/homes", checkJwt, jsonParser, homes.create_home);

router.delete("/api/1/homes/:homeId/notifications/:n_id", checkJwt, jsonParser, notifications.delete_notification);
router.get("/api/1/homes/:homeId/notifications", checkJwt, jsonParser, notifications.get_notifications);
router.patch("/api/1/homes/:homeId/notifications/:n_id", checkJwt, jsonParser, notifications.update_notification);
router.post("/api/1/homes/:homeId/notifications/", checkJwt, jsonParser, notifications.create_notification);

router.get("/api/1/public_dashboards", jsonParser, public_dashboards.get_public_dashboards);

router.get("/api/1/homes/:homeId/panels", checkJwt, jsonParser, panels.get_panels);

router.post("/api/1/homes/:homeId/ai", checkJwt, jsonParser, ai.query_influxdb);

module.exports = {router}
