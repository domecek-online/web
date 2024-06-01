import React, { Fragment } from "react";

import Hero from "../components/Hero";
import Content from "../components/Content";

const Home = () => (
  <Fragment>
    <div className="mensi">
    <Hero />
    <hr />
    <Content />
    </div>
  </Fragment>
);

export default Home;
