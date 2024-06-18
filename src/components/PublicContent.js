import React, { Component, useState, useEffect } from "react";
import Loading from "./Loading";
import { getConfig } from "../config";

import {
  Link,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Row, Col } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const PublicContent = () => {
  const [dashboards, setDashboards] = useState([]);
  const { apiOrigin, audience } = getConfig();
  const [loading, setLoading] = useState();

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiOrigin}/api/1/public_dashboards`, {
        method: "GET",
      });

      const responseData = await response.json();
      setDashboards(responseData)

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboards();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="next-steps my-5">
      <h1 className="my-5 text-center" id="konfigurace">Veřejné nástěnky</h1>
      <p>
        Na této stránce najdete nástěnky domů uživatelů Domeček.online, kteří se rozhodli informace o svém domě sdílet veřejně.
      </p>

      {(Object.keys(dashboards).length == 0 ? (<div>Neexistují žádné Veřejné Nástěnky.</div>) : (
        <ul>
          {Object.keys(dashboards).map((keyName, i) => (
            <li key={keyName}>{keyName}
            <ul>
            {dashboards[keyName].map(dashboard => (
                <li key={dashboard.accessToken}><a href={`https://grafana.domecek.online/public-dashboards/${dashboard.accessToken}`}>{dashboard.title}</a></li>
            ))}
            </ul>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export default PublicContent;
