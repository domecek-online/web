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

    for f_uid in [folder_uid, folder_custom_uid]:
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

