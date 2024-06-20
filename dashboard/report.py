import sqlite3
import sys
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
    dsn="https://541a774b82e334af40d4aff7eecbb930@o4507392194969600.ingest.de.sentry.io/4507452178890832",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    traces_sample_rate=1.0,
    # Set profiles_sample_rate to 1.0 to profile 100%
    # of sampled transactions.
    # We recommend adjusting this value in production.
    profiles_sample_rate=1.0,
)


current_date = datetime.now().strftime("%d. %m. %Y")

config = configparser.ConfigParser()
config.read('/etc/grafana/grafana.ini')


def get_notification_emails(org_id):
    if os.path.exists("/root/domecek/web/db.db"):
        con = sqlite3.connect("/root/domecek/web/db.db")
    else:
        con = sqlite3.connect("/home/jkaluza/domecek-online/web/db.db")
    cur = con.cursor()
    res = cur.execute("select value from notifications where grafana_org_id=? and type=\"email\" and message_types like '%reports%'", [org_id])
    res = res.fetchall()
    if not res:
        con.close()
        return None
    con.close()
    return res


def send_email(receiver, subject, message_plain='', message_html='', images=None):
    '''
    :param sender: str
    :param recipients: [str]
    :param subject: str
    :param message_plain: str
    :param message_html: str
    :param images: [{id:str, path:str}]
    :return: None
    '''

    msg_related = MIMEMultipart('related')

    msg_related['Subject'] = subject
    msg_related['From'] = config["smtp"]["user"]
    msg_related['To'] = receiver
    msg_related.preamble = 'This is a multi-part message in MIME format.'

    msg_alternative = MIMEMultipart('alternative')
    msg_related.attach(msg_alternative)

    plain_part = MIMEText(message_plain, 'plain')
    html_part = MIMEText(message_html, 'html')

    msg_alternative.attach(plain_part)
    msg_alternative.attach(html_part)

    if images:
        for name, data in images.items():
            msg_image = MIMEImage(data)
            msg_image.add_header('Content-ID', '<{0}>'.format(name))
            msg_related.attach(msg_image)

    # Sending the mail
    server = SMTP_SSL(config["smtp"]["host"].split(":")[0], config["smtp"]["host"].split(":")[1])
    try:
        server.login(config["smtp"]["user"], config["smtp"]["password"])
        server.sendmail(config["smtp"]["user"], [msg_related['To']], msg_related.as_string())

    finally:
        server.quit()


dbuser = "grafana"

if os.path.exists("/root/domecek/web/db.db"):
    dbuser_code = "iNkFgdqP71ssfOJuTSEw2ZwiFbCIKCji1tNSa09-gWNZWUNDNypXN_fLnLjOVwK_zGoZRh6AwMTZpiGI7SMPyg=="
else:
    dbuser_code = "lJhdvtVrmDCLZ63fZgHJ3tzzD1wdK4QxrDQfAxmFoDFIyVbgbUXHN6ojt6q1A2Pc_14U2dKk9gPCqCKHg1xJSw=="
dbuser_code = "iNkFgdqP71ssfOJuTSEw2ZwiFbCIKCji1tNSa09-gWNZWUNDNypXN_fLnLjOVwK_zGoZRh6AwMTZpiGI7SMPyg=="
client = InfluxDBClient(url="http://vps.kaluzovi.eu:8086", token=dbuser_code, org="grafana")


def dashboard_to_text(client, dashboard):
    data = OrderedDict()
    query_api = client.query_api()
    have_some_data = False
    for panel in dashboard["panels"]:
        if "targets" not in panel:
            continue
        data[panel["title"]] = OrderedDict()

        u = panel["fieldConfig"]["defaults"]["unit"]
        try:
            u  = {
                "suffix:km": " km",
                "kwatth": " kWh",
                "celsius": " °C",
                "lengthmm": " mm",
                "lengthkm": " km",
                "percent": " %",
                "litre": " l",
            }[u]
        except:
            u = ""
        data[panel["title"]]["__unit__"] = u
        for target in panel["targets"]:
            query = str(target["query"])
            query = query.replace("v.timeRangeStart", '-7d')
            query = query.replace("v.timeRangeStop", '-1s')
            query = query.replace("v.windowPeriod", '1h')
            try:
                result = query_api.query(query=query)
            except Exception as e:
                if "could not find bucket" in str(e):
                    result = None
                else:
                    raise
            if not result:
                continue
            have_some_data = True
            for table in result:
                for record in table.records:
                    v = record.values
                    for field in ["_time", "result", "table"]:
                        if field in v:
                            del v[field]
                    # data[panel["title"]] = {}
                    if "_field" in v:
                        data[panel["title"]][v["_field"]] = v["_value"]
                    elif "_value" not in v:
                        data[panel["title"]].update(v)
                    else:
                        data[panel["title"]]["Value"] = v["_value"]

    if not have_some_data:
        return ""

    t = "<ul>\n"
    for title, d in data.items():
        title = title.replace("Dnešní", 'Včerejší')
        t += f"    <li>{title}\n"
        t += f"        <ul>\n"
        unit = d["__unit__"]
        for k, v in d.items():
            if k.startswith("__"):
                continue
            v = round(v, 2)
            k = k.replace("Měřič ", "").replace("Grid", "Síť").replace("Value", "Ostatní")
            t += f"            <li><b>{k}</b>: {v}{unit}</li>\n"
        t += f"        </ul>\n"
        t += f"    </li>\n"
    t += "</ul>\n"

    return t



with open("../api_config.json") as f:
    cfg = json.loads(f.read())
    grafana_username = cfg["grafana_username"]
    grafana_password = cfg["grafana_password"]
    grafana_auth = HTTPBasicAuth(grafana_username, grafana_password)

test = False
if len(sys.argv) == 2 and sys.argv[1] == "--test":
    test = True

r = requests.get(f'https://grafana.domecek.online/api/orgs', auth=grafana_auth)
for org in r.json():
    print(org["name"], org["id"])
    emails = get_notification_emails(org["id"]) or []
    if not emails and not test:
        continue

    headers = {
        "X-Grafana-Org-Id": str(org["id"]),
        "Content-Type": "application/json",
    }

    # Get folder_uid of existing folder or create it.
    r = requests.get(f'https://grafana.domecek.online/api/search?type=dash-db', auth=grafana_auth, headers=headers)
    daily_report = None
    for d in r.json():
        if d["title"] == "Hlášení - dnes":
            daily_report = d
            break
    if not daily_report:
        continue

    print(f"Generating daily report for {org['name']}")
    with open("report-daily.json") as f:
        d = f.read()
        d = d.replace("bucket: \\\"Doma\\\"", f"bucket: \\\"{org['name']}\\\"")
        d = d.replace("bucket: \\\"Kalužovi\\\"", f"bucket: \\\"{org['name']}\\\"")
        dashboard = json.loads(d)
        stats = dashboard_to_text(client, dashboard)

    if not stats:
        print("No data to send")
        continue

    uri = daily_report["url"].replace("/d/", "")
    panels = {
        1: "today_electricity.png",
        3: "mean_electricity.png",
        4: "today_sources.png",
        5: "mean_sources.png",
        6: "today_temp.png",
        7: "mean_temp.png",
    }
    images = {}
    for i, name in panels.items():
        url = f"https://grafana.domecek.online/render/d-solo/{uri}?from=1717647537607&to=1717669137608&panelId={i}"
        print("Downloading", url)
        r = requests.get(url, auth=grafana_auth, headers=headers)
        images[name] = r.content

    html = f"""
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
    <title></title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body>
    <p>
    Dobrý den,
    </p>
    <p>
    Zasíláme Vám denní statistiky Vašeho domu ''{org["name"]}' za včerejší den.
    </p>
    {stats}
    <img src="cid:today_temp.png"/><br/>
    <img src="cid:mean_temp.png"/><br/>
    <img src="cid:today_electricity.png"/><br/>
    <img src="cid:mean_electricity.png"/><br/>
    <img src="cid:today_sources.png"/><br/>
    <img src="cid:mean_sources.png"/><br/>
</body>
</html>"""
    print(html)
    print(emails)
    for email in emails:
        send_email(
            email[0],
            f"Domeček.online - Denní hlášení: {org['name']} ({current_date})",
            "Pro zobrazení emailu musíte povolit zobrazování HTML",
            html,
            images
        )
