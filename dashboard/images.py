import sqlite3
import sys
import time
import os
import json
import requests
from requests.auth import HTTPBasicAuth
from pprint import pprint
import time
from influxdb_client import InfluxDBClient
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from smtplib import SMTP_SSL
import configparser
from collections import OrderedDict
from operator import itemgetter
from datetime import datetime
import sentry_sdk

sentry_sdk.init(
    dsn="https://71b17c999fe170355f680b26b9cbb916@o4507392194969600.ingest.de.sentry.io/4507476782874704",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile 100%
    # of sampled transactions.
    # We recommend adjusting this value in production.
    profiles_sample_rate=1.0,
)


if not os.path.exists(sys.argv[1]):
    os.makedirs(sys.argv[1])

with open("../api_config.json") as f:
    cfg = json.loads(f.read())
    grafana_username = cfg["grafana_username"]
    grafana_password = cfg["grafana_password"]
    grafana_auth = HTTPBasicAuth(grafana_username, grafana_password)


r = requests.get(f'https://grafana.domecek.online/api/orgs', auth=grafana_auth)
for org in r.json():
    print(org["name"], org["id"])

    headers = {
        "X-Grafana-Org-Id": str(org["id"]),
        "Content-Type": "application/json",
    }

    # Get folder_uid of existing folder or create it.
    r = requests.get(f'https://grafana.domecek.online/api/search?type=dash-db', auth=grafana_auth, headers=headers)
    daily_report = None
    for dashboard in r.json():
        if dashboard["title"] != "Hlášení - dnes":
            continue
        d_uid = dashboard["uid"]
        d_uri = dashboard["url"].replace("/d/", "")
        r = requests.get(f'https://grafana.domecek.online/api/dashboards/uid/{d_uid}', auth=grafana_auth, headers=headers)
        d = r.json()
        
        for panel in d["dashboard"]["panels"]:
            i = panel["id"]
            f = int(time.time()) - 3600
            t = int(time.time())
            url = f"https://grafana.domecek.online/render/d-solo/{d_uri}?from={f}&to={t}&panelId={i}"
            print("Downloading", url)
            r = requests.get(url, auth=grafana_auth, headers=headers)
            fn = os.path.join(sys.argv[1], f'{d_uid}_{i}.png')
            print(f"Saving as {fn}")
            with open(fn, "wb") as f:
                f.write(r.content)
