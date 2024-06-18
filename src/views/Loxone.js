import React, { Fragment } from "react";

import LoxoneContent from "../components/LoxoneContent";
import TableOfContents from '../components/TableOfContents';

export const Loxone = () => (
  <Fragment>
    <TableOfContents />
      <div className="mensi">
    <LoxoneContent/>
    </div>
  </Fragment>
);

export default Loxone;
