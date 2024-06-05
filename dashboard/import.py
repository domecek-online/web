import sys
import os
import json
import requests
from requests.auth import HTTPBasicAuth
from pprint import pprint
import time
from influxdb_client import InfluxDBClient
dbuser = "grafana"

if os.path.exists("/root/domecek/web/db.db"):
    dbuser_code = "iNkFgdqP71ssfOJuTSEw2ZwiFbCIKCji1tNSa09-gWNZWUNDNypXN_fLnLjOVwK_zGoZRh6AwMTZpiGI7SMPyg=="
else:
    dbuser_code = "lJhdvtVrmDCLZ63fZgHJ3tzzD1wdK4QxrDQfAxmFoDFIyVbgbUXHN6ojt6q1A2Pc_14U2dKk9gPCqCKHg1xJSw=="
client = InfluxDBClient(url="http://localhost:8086", token=dbuser_code, org="grafana")


with open("../api_config.json") as f:
    cfg = json.loads(f.read())
    grafana_username = cfg["grafana_username"]
    grafana_password = cfg["grafana_password"]
    grafana_auth = HTTPBasicAuth(grafana_username, grafana_password)

no_data_panel = {
    "datasource": {
    "type": "influxdb",
    "uid": "fdn5d77g8x1xcf"
    },
    "gridPos": {
    "h": 7,
    "w": 24,
    "x": 0,
    "y": 0
    },
    "id": 2,
    "options": {
    "code": {
        "language": "plaintext",
        "showLineNumbers": False,
        "showMiniMap": False
    },
    "content": "Váš dům neposílá žádná data využitelná v této nástěnce.\n\n",
    "mode": "markdown"
    },
    "pluginVersion": "10.4.1",
    "title": "Data nejsou k dispozici.",
    "type": "text"
}

def filter_panels(client, dashboard):
    query_api = client.query_api()
    new_panels = []
    for panel in dashboard["panels"]:
        if "targets" not in panel:
            new_panels.append(panel)
            continue
        query = str(panel["targets"][0]["query"])
        query = query.replace("v.timeRangeStart", '-7d')
        query = query.replace("v.timeRangeStop", '-1s')
        query = query.replace("v.windowPeriod", '1h')
        try:
            result = query_api.query(query=query)
        except:
            result = True
        if result:
            new_panels.append(panel)

    if not new_panels:
        new_panels.append(no_data_panel)

    dashboard["panels"] = new_panels
    return dashboard

org_to_check = None
if len(sys.argv) == 2:
    org_to_check = sys.argv[1]

r = requests.get(f'http://localhost:3000/api/orgs', auth=grafana_auth)
for org in r.json():
    if org_to_check and org["name"] != org_to_check:
        continue
    print(f"Importing Dashboards to organization {org['name']}")
    headers = {
        "X-Grafana-Org-Id": str(org["id"]),
        "Content-Type": "application/json",
    }

    # Get folder_uid of existing folder or create it.
    r = requests.get(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers)
    folder_custom_uid = None
    folder_custom_id = None
    for folder in r.json():
        if folder["title"] == "Vlastní nástěnky":
            folder_custom_uid = folder["uid"]
            folder_custom_id = folder["id"]
    if not folder_custom_uid:
        # Create folder
        data = {"title": "Vlastní nástěnky"}
        r = requests.post(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers, json=data)
        folder_custom_uid = r.json()["uid"]
        folder_custom_id = r.json()["id"]

    # Get folder_uid of existing folder or create it.
    r = requests.get(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers)
    folder_uid = None
    folder_id = None
    for folder in r.json():
        if folder["title"] == "Standardní nástěnky":
            folder_uid = folder["uid"]
            folder_id = folder["id"]
    if not folder_uid:
        # Create folder
        data = {"title": "Standardní nástěnky"}
        r = requests.post(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers, json=data)
        folder_uid = r.json()["uid"]
        folder_id = r.json()["id"]

    # Get datasource.
    r = requests.get(f'http://localhost:3000/api/datasources', auth=grafana_auth, headers=headers)
    if not r.json():
        print(f"No datasource found in {org['name']}")
        continue
    datasource_uid = r.json()[0]["uid"]

    # Dashboards
    for f_uid in [folder_uid, folder_custom_uid]:
        for template in os.listdir("."):
            if not template.endswith(".json"):
                continue
            with open(template) as f:
                d = f.read()
                d = d.replace("bucket: \\\"Doma\\\"", f"bucket: \\\"{org['name']}\\\"")
                d = d.replace("bucket: \\\"Kalužovi\\\"", f"bucket: \\\"{org['name']}\\\"")
                dashboard = json.loads(d)
                del dashboard["id"]
                del dashboard["uid"]
                dashboard = filter_panels(client, dashboard)
                for panel in dashboard["panels"]:
                    panel["datasource"]["uid"] = datasource_uid
                    for target in panel.get("targets", []):
                        target["datasource"]["uid"] = datasource_uid
                    if "options" in panel and "folderUID" in panel["options"]:
                        if panel["title"].startswith("Vlastn"):
                            panel["options"]["folderUID"] = folder_custom_uid
                            panel["options"]["folderId"] = folder_custom_id
                        else:
                            panel["options"]["folderUID"] = folder_uid
                            panel["options"]["folderId"] = folder_id

            data = {
                "dashboard": dashboard,
                "folderUid": f_uid,
                "message": "Automated update",
                "overwrite": f_uid == folder_uid
            }
            r = requests.post(f'http://localhost:3000/api/dashboards/db', auth=grafana_auth, headers=headers, json=data)
            pprint(r.json())
            dashboard_uid = r.json().get("uid")
            if not dashboard_uid:
                continue

            if template == "home.json":
                data = {
                    "homeDashboardUID": dashboard_uid,
                }
                r = requests.put(f'http://localhost:3000/api/org/preferences', auth=grafana_auth, headers=headers, json=data)
                pprint(r.json())


    # Alert Rules
    r = requests.get(f'http://localhost:3000/api/v1/provisioning/alert-rules', auth=grafana_auth, headers=headers)
    title2uid = {}
    pprint(r.json())
    for data in r.json():
        title2uid[data["title"]] = data["uid"]
    for template in os.listdir("./alerts"):
        template = "./alerts/" + template
        if not template.endswith(".json"):
            continue
        with open(template) as f:
            alerts = json.loads(f.read().replace("bucket: \\\"Doma\\\"", f"bucket: \\\"{org['name']}\\\""))
            for group in alerts["groups"]:
                for rule in group["rules"]:
                    for model in rule["data"]:
                        if model["datasourceUid"] != "__expr__":
                            model["datasourceUid"] = datasource_uid
                            model["model"]["datasource"]["uid"] = datasource_uid
                    rule["folderUID"] = folder_uid
                    rule["ruleGroup"] = "Upozornění"
                    if rule["title"] in title2uid:
                        r = requests.put(f'http://localhost:3000/api/v1/provisioning/alert-rules/{title2uid[rule["title"]]}', auth=grafana_auth, headers=headers, json=rule)
                    else:
                        r = requests.post(f'http://localhost:3000/api/v1/provisioning/alert-rules', auth=grafana_auth, headers=headers, json=rule)
                    pprint(r.json())

    # Contact Points
    for i in range(10):
        r = requests.get(f'http://localhost:3000/api/v1/provisioning/contact-points', auth=grafana_auth, headers=headers)
        name2uid = {}
        try:
            for data in r.json():
                name2uid[data["name"]] = data["uid"]
        except:
            time.sleep(2)
            continue
        pprint(name2uid)
        if "Webhook" not in name2uid:
            data = {
                "settings": {
                    "httpMethod": "POST",
                    "url": "http://localhost:3002"
                },
                'type': 'webhook',
                'name': "Webhook",
            }
            r = requests.post(f'http://localhost:3000/api/v1/provisioning/contact-points', auth=grafana_auth, headers=headers, json=data)
            print(r.content)
            pprint(r.json())
