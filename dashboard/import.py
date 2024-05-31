import sys
import os
import json
import requests
from requests.auth import HTTPBasicAuth
from pprint import pprint

with open("../api_config.json") as f:
    cfg = json.loads(f.read())
    grafana_username = cfg["grafana_username"]
    grafana_password = cfg["grafana_password"]
    grafana_auth = HTTPBasicAuth(grafana_username, grafana_password)


r = requests.get(f'http://localhost:3000/api/orgs', auth=grafana_auth)
for org in r.json():
    print(f"Importing Dashboards to organization {org['name']}")
    headers = {
        "X-Grafana-Org-Id": str(org["id"]),
        "Content-Type": "application/json",
    }

    # Get folder_uid of existing folder or create it.
    r = requests.get(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers)
    folder_uid = None
    for folder in r.json():
        if folder["title"] == "Standardní nástěnky":
            folder_uid = folder["uid"]
    if not folder_uid:
        # Create folder
        data = {"title": "Standardní nástěnky"}
        r = requests.post(f'http://localhost:3000/api/folders', auth=grafana_auth, headers=headers, json=data)
        folder_uid = r.json()["uid"]

    # Get datasource.
    r = requests.get(f'http://localhost:3000/api/datasources', auth=grafana_auth, headers=headers)
    if not r.json():
        print(f"No datasource found in {org['name']}")
        continue
    datasource_uid = r.json()[0]["uid"]

    print(f"Found folder with uid {folder_uid}")
    for template in os.listdir("."):
        if not template.endswith(".json"):
            continue
        with open(template) as f:
            dashboard = json.loads(f.read().replace("bucket: \\\"Doma\\\"", f"bucket: \\\"{org['name']}\\\""))
            del dashboard["id"]
            del dashboard["uid"]
            for panel in dashboard["panels"]:
                panel["datasource"]["uid"] = datasource_uid
                for target in panel.get("targets", []):
                    target["datasource"]["uid"] = datasource_uid
                if "options" in panel and "folderUID" in panel["options"]:
                    panel["options"]["folderUID"] = folder_uid

        data = {
            "dashboard": dashboard,
            "folderUid": folder_uid,
            "message": "Automated update",
            "overwrite": True
        }
        r = requests.post(f'http://localhost:3000/api/dashboards/db', auth=grafana_auth, headers=headers, json=data)
        pprint(r.json())
        dashboard_uid = r.json()["uid"]

        if template == "home.json":
            data = {
                "homeDashboardUID": dashboard_uid,
            }
            r = requests.put(f'http://localhost:3000/api/org/preferences', auth=grafana_auth, headers=headers, json=data)
            pprint(r.json())

