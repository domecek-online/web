import React, { Fragment } from "react";

import Hero from "../components/Hero";
import LoxoneContent from "../components/LoxoneContent";
import TableOfContents from '../components/TableOfContents';

const Loxone = () => (
  <Fragment>
    <TableOfContents />
    <LoxoneContent />
  </Fragment>
);

export default Loxone;
