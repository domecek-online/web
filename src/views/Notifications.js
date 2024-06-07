import React, { useState, useEffect } from "react";
import { Button, Alert } from "reactstrap";
import {Link, useParams} from 'react-router-dom';

import Highlight from "../components/Highlight";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const HomesComponent = () => {
  const { apiOrigin, audience } = getConfig();
  const {homeId} = useParams();
  const [homeName, setHomeName] = useState("");

  const [type, setType] = useState("email");
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [state, setState] = useState({
    showResult: false,
    apiMessage: "",
    error: null,
  });

  const {
    getAccessTokenSilently,
    loginWithPopup,
    getAccessTokenWithPopup,
    user
  } = useAuth0();

  const handleConsent = async () => {
    try {
      await getAccessTokenWithPopup();
      setState({
        ...state,
        error: null,
      });
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }

    await callApi();
  };

  const handleLoginAgain = async () => {
    try {
      await loginWithPopup();
      setState({
        ...state,
        error: null,
      });
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }

    await callApi();
  };

  const callApi = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/external`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      setState({
        ...state,
        showResult: true,
        apiMessage: responseData,
      });
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  };

  const handle = (e, fn) => {
    e.preventDefault();
    fn();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          'type': type,
          'value': value,
        })
      });

      const responseData = await response.json();
      setMessage(responseData.msg)

      fetchNotifications();
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  const updateNotification = async (n_id, message_types, message_type) => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      var data = message_types;
      if (message_types.includes(message_type)) {
        data = data.filter(e => e !== message_type);
      }
      else {
        data.push(message_type)
      }

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/notifications/${n_id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          'message_types': data,
        })
      });

      const responseData = await response.json();

      fetchNotifications();
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  const removeNotification = async (n_id) => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/notifications/${n_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      fetchNotifications();
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  const fetchHome = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      if (responseData.length == 0) {
        setHomeName("");
        return;
      }

      setHomeName(responseData[0].name);

    } catch (error) {
      console.log(error);
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      console.log(responseData);

      setNotifications(responseData)
      setLoading(false);
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  useEffect(() => {
    fetchHome();
    fetchNotifications();
  }, [])

  return (
    <>
        <div className="mensi">
      <div className="mb-5">
        {state.error === "consent_required" && (
          <Alert color="warning">
            You need to{" "}
            <a
              href="#/"
              class="alert-link"
              onClick={(e) => handle(e, handleConsent)}
            >
              consent to get access to users api
            </a>
          </Alert>
        )}

        {state.error === "login_required" && (
          <Alert color="warning">
            You need to{" "}
            <a
              href="#/"
              class="alert-link"
              onClick={(e) => handle(e, handleLoginAgain)}
            >
              log in again
            </a>
          </Alert>
        )}

        <h1 className="my-5 text-center" id="konfigurace">
          Konfigurace notifikací {homeName ? (<>pro dům: {homeName}</>) : (<></>)}
        </h1>
        <p className="lead">
          Zde můžete nastavit, kam bude Domeček.online zasílat Upozornění na nenadálé situace a poruchy a pravidelná Hlášení.
        </p>
        <p>
          Rozdíl mezi Upozorněním a Hlášením:<br/><br/>
          <ul>
            <li><b>Upozornění</b> - Upozornění je krátká zpráva odeslána při nenadálé události.
              <ul><li>Například únik vody, otevřená vrata, nízká teplota v domě, ...</li></ul>
            </li>
            <li><b>Hlášení</b> - Hlášení jsou pravidelné zprávy obsahující statistiky.
              <ul>
                <li>Například informace o spotřebované a vyrobené elektrické energie za daný den, týden, měsíc, rok, ...</li>
                <li>Hlášení nelze odesílat pomocí SMS.</li>
              </ul>
            </li>
          </ul>
        </p>

      {loading ? (
        <div>Nahrávám...</div>
      ) : (
        notifications.length == 0 ? (<div>Nemáte nastavená žádná upozornění.</div>)
        : (
          <>
            <table border={1}>
              <tr>
                <th>Typ upozornění</th>
                <th>Hodnota</th>
                <th>Upozornění</th>
                <th>Denní hlášení</th>
                <th>Odstranit</th>
              </tr>
              {notifications.map(n => (
                <tr key={n.id}>
                  <td>{n.type}</td>
                  <td>{n.value}</td>
                  <td>
                    <Button
                      color="primary"
                      type="submit"
                      onClick={() => updateNotification(n.id, n.message_types, "alerts")}
                    >
                      {n.message_types.includes("alerts") ? (
                        <>Vypnout zasílání Upozornění</>
                      ) : (
                        <>Zapnout zasílání Upozornění</>
                      )}
                    </Button>
                  </td>
                  {n.type != "sms" ? (
                    <td>
                      <Button
                        color="primary"
                        type="submit"
                        onClick={() => updateNotification(n.id, n.message_types, "reports")}
                      >
                        {n.message_types.includes("reports") ? (
                          <>Vypnout zasílání Denních Hlášení</>
                        ) : (
                          <>Zapnout zasílání Denních Hlášení</>
                        )}

                      </Button>
                    </td>
                  ) : (
                    <td>
                        Nelze zasílat pomocí SMS
                    </td>
                  )}
                  <td>
                    <Button
                      color="primary"
                      type="submit"
                      onClick={() => removeNotification(n.id)}
                    >
                      Odstranit
                    </Button>
                  </td>
                </tr>
              ))}
            </table>
          </>
        )
      )}
      <br/>
                <h1>Přidat nový typ upozornění</h1>


              <form onSubmit={handleSubmit}>
                <div class="form-group">
                  <label>Zasílat upozornění na:</label>
                  <select class="form-control" onChange={(e) => setType(e.target.value)}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                  <small class="form-text text-muted">Vyberte kam chcete upozornění zasílat.</small>
                </div>

            {type === "email" &&
                <div class="form-group">
                  <label>Emailová adresa:</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Emailová adresa"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <small class="form-text text-muted">Upozornění Vám budeme posílat na tuto emailovou adresu.</small>
                </div>
            }
            {type === "sms" &&
                <div class="form-group">
                  <label>Telefonní číslo:</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Telefonní číslo"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <small class="form-text text-muted">Upozornění Vám budeme posílat na pomocí SMS na toto telefonní číslo.</small>
                </div>
            }


                {!message ? (
                  <div></div>
                ): (
                  <div class="alert alert-danger" role="alert">
                  {message}
                  </div>
                )}

                    <Button
                    color="primary"
                    className="mt-5"
                    type="submit"
                  >
                    Přidat nový typ upozornění
                  </Button>
              </form>



      </div>
      </div>


    </>
  );
};

export default withAuthenticationRequired(HomesComponent, {
  onRedirecting: () => <Loading />,
});
