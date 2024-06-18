import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { Container } from "reactstrap";

import Loading from "./components/Loading";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./views/Home";
import Profile from "./views/Profile";
import Homes from "./views/Homes";
import Loxone from "./views/Loxone";
import Public from "./views/Public";
import Notifications from "./views/Notifications";
import { useAuth0 } from "@auth0/auth0-react";
import history from "./utils/history";
import * as Sentry from "@sentry/react";
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';


// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

// styles
import "./App.css";

// fontawesome
import initFontAwesome from "./utils/initFontAwesome";


Sentry.init({
  dsn: "https://797be89fb352c7f43edd60d260c004c4@o4507392194969600.ingest.de.sentry.io/4507392203161680",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/domecek\.online/],
  // Session Replay
  replaysSessionSampleRate: 1.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

initFontAwesome();

const App = () => {
  const { isLoading, error } = useAuth0();

  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Sentry.ErrorBoundary fallback={"An error has occurred"}>
    <Router history={history}>
      <div id="app" className="d-flex flex-column h-100">
        <NavBar />
        <Container fluid>
          <Switch>
            <Route path="/" exact component={Home} />
            <Route path="/public" exact component={Public} />
            <Route path="/profile" component={Profile} />
            <Route path="/homes" component={Homes} />
            <Route path="/loxone" exact component={Loxone} />
            <Route path="/loxone/:homeId" component={Loxone} />
            <Route path="/notifications" exact component={Notifications} />
            <Route path="/notifications/:homeId" component={Notifications} />
          </Switch>
        </Container>
        <Footer />
      </div>
    </Router>
    </Sentry.ErrorBoundary>
  );
};

export default App;
