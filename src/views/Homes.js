import React, { useState, useEffect } from "react";
import { Button, Alert } from "reactstrap";
import {Link} from 'react-router-dom';

import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const HomesComponent = () => {
  const { apiOrigin, audience } = getConfig();

  const [name, setName] = useState("");
  const [homesMessage, setHomesMessage] = useState("");
  const [homes, setHomes] = useState([])
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

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

      const response = await fetch(`${apiOrigin}/api/1/homes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          'name': name,
          'grafana_username': username,
          'grafana_password': password
        })
      });

      const responseData = await response.json();
      setMessage(responseData.msg)

      fetchHomes();
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  const removeHome = async (home_id) => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${home_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      fetchHomes();
    } catch (error) {
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
        <h1>Moje domy</h1>
        <p className="lead">
          Zde můžete spravovat své domy zaregistrované na Domeček.online.
        </p>

        {homes.length == 0 ? (<div>{homesMessage}</div>) : (
          <table border={1} data-testid="list-of-homes">
            <thead>
              <tr>
                <th>Jméno domu</th>
                <th>Loxone token</th>
                <th>Konfigurace Loxone</th>
                <th>Konfigurace Notifikací</th>
                <th>Grafana</th>
                <th>Odstranit</th>
              </tr>
            </thead>
            <tbody>
              {homes.map(home => (
                <tr key={home.id}>
                  <td>{home.name}</td>
                  <td>{home.loxone_token}</td>
                  <td><Link to={{pathname: `/loxone/${home.id}`}}>Konfigurace Loxone</Link></td>
                  <td><Link to={{pathname: `/notifications/${home.id}`}}>Konfigurace Notifikací</Link></td>
                  <td><a href={`https://grafana.domecek.online/?orgId=${home.grafana_org_id}`}>Otevřít Grafanu</a></td>
                  <td>
                    <Button
                      color="primary"
                      type="submit"
                      onClick={() => removeHome(home.id)}
                    >
                      Odstranit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <br/>

        <h1>Přidat nový dům</h1>
        <p>Povolené znaky jsou pouze malá a velká písmena, čísla, mezera a podtržítko.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Jméno domu:</label>
            <input
              type="text"
              data-testid="home-name"
              className="form-control"
              placeholder="Jméno domu"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <small className="form-text text-muted">Toto jméno pak můžete sdílet s ostatními uživateli. Povolené znaky jsou pouze malá a velká písmena, čísla, mezera a podtržítko.</small>
          </div>
          <div className="form-group">
            <label>Uživatelské jméno do nástroje Grafana:</label>
            <input
              type="text"
              data-testid="user-name"
              className="form-control"
              placeholder="Uživatelské jméno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <small className="form-text text-muted">Pomocí tohoto uživatelského jména se přihlásíte do administrace nástroje Grafana, kde uvidíte statistiky Vašeho domu</small>
          </div>
          <div className="form-group">
            <label>Uživatelské heslo do nástroje Grafana:</label>
            <input
              type="password"
              data-testid="password"
              className="form-control"
              placeholder="Uživatelské Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small className="form-text text-muted">Pomocí tohoto hesla se přihlásíte do administrace nástroje Grafana, kde uvidíte statistiky Vašeho domu.</small>
          </div>

          {!message ? (
            <div></div>
          ): (
            <div className="alert alert-danger" role="alert" data-testid="add_home_alert">
            {message}
            </div>
          )}

          <Button
            color="primary"
            className="mt-5"
            type="submit"
            aria-label="Přidat nový dům"
          >
            Přidat nový dům
          </Button>
        </form>
      </div>
    </div>
  );
};

export default withAuthenticationRequired(HomesComponent, {
  onRedirecting: () => <Loading />,
});
