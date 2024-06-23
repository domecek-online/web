import React, { useState, useEffect, useMemo } from "react";
import { Button, Alert } from "reactstrap";
import {Link, useParams, useHistory} from 'react-router-dom';

import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const NotificationsComponent = () => {
  const { apiOrigin, audience } = getConfig();
  const {homeId} = useParams();
  const history = useHistory();
  const [homeName, setHomeName] = useState("");
  const [panels, setPanels] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");


  const {
    getAccessTokenSilently,
    loginWithPopup,
    getAccessTokenWithPopup,
    user
  } = useAuth0();

  const filteredPanels = useMemo(() => {
    if (!searchTerm) return panels;

    if (panels.length > 0) {
        const list = [];
  
        for (const panel of panels) {
            const value = panel.title.toLowerCase();
            console.log(value);
            if (value.includes(searchTerm.toLowerCase())) {
                list.push(panel);
            }
        }
        return list;
    }

    return [];
  }, [searchTerm, panels]);

  const fetchPanels = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}/panels`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      setPanels(responseData)
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!homeId) {
      history.push("/homes");
    }
    else {
      fetchPanels();
    }
  }, [])

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="mensi">
      <div className="mb-5">
        <h1 className="my-5 text-center" id="konfigurace">
          Obrázky panelů {homeName ? (<>pro dům: {homeName}</>) : (<></>)}
        </h1>
        <p className="lead">
          Zde můžete vidět obrázky panelů exportované z Grafany. Lze je použít v jiných aplikacích nebo na jiných webových stránkách.
        </p>

        <input
            size="lg"
            bordered
            clearable
            placeholder="Hledat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />

        {(panels.length == 0 ? (<div>Nemáte žádné funkční panely.</div>) : (
          <table border={1}>
            <thead>
              <tr>
                <th>Název</th>
                <th>Adresa obrázku</th>
                <th>Obrázek</th>
              </tr>
            </thead>
            <tbody>
              {filteredPanels.map(p => (
                <tr key={p.url}>
                  <td>{p.title}</td>
                  <td>{p.url}</td>
                  <td><img src={p.url}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
};

export default withAuthenticationRequired(NotificationsComponent, {
  onRedirecting: () => <Loading />,
});
