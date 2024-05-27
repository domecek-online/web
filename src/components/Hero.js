import React from "react";

import logo from "../assets/logo.svg";

const Hero = () => (
  <div className="text-center hero my-5">
    <img className="mb-3" src={logo} alt="Domecek.online logo" width="240" />
    <h1 className="mb-4">Domeček.online</h1>
    <p className="lead">
      Získejte grafy, statistiky, hlášení z Vašeho inteligentního domu a porovnávejte je s přáteli.
    </p>
  </div>
);

export default Hero;
