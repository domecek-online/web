import React, { useState, useEffect } from "react";
import { Button, Alert } from "reactstrap";
import Highlight from "../components/Highlight";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const HomesComponent = () => {
  const { apiOrigin, audience } = getConfig();

  const [name, setName] = useState("");
  const [homes, setHomes] = useState([])
  const [loading, setLoading] = useState(false)

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

      const response = await fetch(`${apiOrigin}/api/1/homes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-type': 'application/json',
        },
        body: JSON.stringify({'name': name})
      });

      const responseData = await response.json();

      fetchHomes();
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  const removeHome = async (home_name) => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${home_name}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      fetchHomes();
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  const fetchHomes = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes_by_username/${user.sub}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      setHomes(responseData)
      setLoading(false);
    } catch (error) {
      setState({
        ...state,
        error: error.error,
      });
    }
  }

  useEffect(() => {
    fetchHomes();
  }, [])

  return (
    <>
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

        <h1>Moje domy</h1>
        <p className="lead">
          Zde můžete spravovat své domy zaregistrované na Domeček.online.
        </p>

      {loading ? (
        <div>Nahrávám...</div>
      ) : (
        <>
          <table border={1}>
            <tr>
              <th>Jméno domu</th>
              <th>Loxone token</th>
              <th>Odstranit</th>
            </tr>
            {homes.map(home => (
              <tr key={home.id}>
                <td>{home.name}</td>
                <td>{home.loxone_token}</td>
                <td>
                  <Button
                    color="primary"
                    type="submit"
                    onClick={() => removeHome(home.name)}
                  >
                    Odstranit
                  </Button>
                </td>
              </tr>
            ))}
          </table>
        </>
      )}
      <br/>
                <h1>Přidat nový dům</h1>
                <p>Povolené znaky jsou pouze malá a velká písmena, čísla, mezera a podtržítko.</p>
      <form onSubmit={handleSubmit}>
        <label>Jméno domu:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
          <Button
            color="primary"
            className="mt-5"
            type="submit"
          >
            Přidat nový dům
          </Button>
      </form>



      </div>


    </>
  );
};

export default withAuthenticationRequired(HomesComponent, {
  onRedirecting: () => <Loading />,
});
