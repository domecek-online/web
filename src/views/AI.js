import React, { useState, useEffect, useMemo } from "react";
import { Button, Alert } from "reactstrap";
import {Link, useParams, useHistory} from 'react-router-dom';

import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const AIComponent = () => {
  const { apiOrigin, audience } = getConfig();
  const history = useHistory();
  const [homes, setHomes] = useState([]);
  const [homesMessage, setHomesMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [homeId, setHomeId] = useState(0);
  const [result, setResult] = useState({});
  const [loading, setLoading] = useState(false)
  const [grafanaPayload, setGrafanaPayload] = useState("")


  const {
    getAccessTokenSilently,
    loginWithPopup,
    getAccessTokenWithPopup,
    user
  } = useAuth0();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/ai`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          question: question
        })
      });

      const responseData = await response.json();
      console.log(responseData);
      setResult(responseData);
  
      var payload = {
        "os7": {
          "queries": [{
            "refId":"A",
            "query": responseData.query,
            "datasource":{"type":"influxdb","uid":"fdns6aanef1moa"}
          }],
          "range":{"from":"now-1h","to":"now"}
        }
      }
      setGrafanaPayload(encodeURI(JSON.stringify(payload)));
      console.log(grafanaPayload);

      fetchHomes();
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  const fetchHomes = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      if (responseData["error"]) {
        setHomesMessage(responseData["error"])
      }
      else if (responseData["data"] && responseData["data"].length == 0) {
        setHomesMessage("Nemáte vytvořené žádné domy.")
      }
      setHomes(responseData["data"]);
      setHomeId(Object.values(responseData["data"])[0].id);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }

  }

  useEffect(() => {
    fetchHomes();
  }, [])

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="mensi">
      <div className="mb-5">
        <h1 className="my-5 text-center" id="konfigurace">
          Zeptejte se svého domu
        </h1>
        <p className="lead">
          Na této stránce můžete svému domu položit jednoduchou otázku.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Dům, kterého se chcete zeptat na otázku</label>
            <select
              className="form-control" onChange={(e) => setHomeId(e.target.value)} data-testid="notification_type"
              defaultValue={homeId}
            >
              {homes.map(home => (
                <option key={home.id} value={home.id}>{home.name}</option>
              ))}
            </select>
            <small className="form-text text-muted">Vyberte dům, kterého se chcete zeptat na otázku.</small>
          </div>
          <div className="form-group">
            <label>Otázka: </label>
              <input
                size="1g"
                bordered
                clearable
                placeholder="Otázka - například 'Kolik elektřiny se spotřebovalo včera?'"
                value={question}
                style={{width: "100%"}}
                onChange={(e) => setQuestion(e.target.value)}
              />
            <small className="form-text text-muted">Položte otázku.</small>
          </div>

          <Button
              color="primary"
              className="mt-5"
              type="submit"
            >
              Zeptat se
            </Button>

        </form>

        {(Object.keys(result).length === 0 ? (<div></div>) : (
          <>
            <p>InfluxDB dotaz vygenerovaný umělou inteligencí:</p>
            <pre>
              {result.query}
            </pre>
            <a href={`https://grafana.domecek.online/explore?schemaVersion=1&panes=${grafanaPayload}`}>Otevřít v Grafaně.</a>
            <table border={1}>
              <thead>
                <tr>
                  <th>Čas</th>
                  <th>Měření</th>
                  <th>Hodnota</th>
                </tr>
              </thead>
              <tbody>
                {result["result"].map(r => (
                  <tr key={r._time}>
                    <td>{r._time}</td>
                    <td>{r._measurement}</td>
                    <td>{r._value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ))}
      </div>
    </div>
  );
};

export default withAuthenticationRequired(AIComponent, {
  onRedirecting: () => <Loading />,
});
