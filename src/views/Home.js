import React, { Fragment } from "react";

import Hero from "../components/Hero";
import Content from "../components/Content";
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';


// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';

import graphs1 from "../assets/graphs1.png";
import graphs from "../assets/graphs.png";
import logo from "../assets/logo.svg";

const Home = () => (
  <Fragment>
    <div className="mensi">
    <hr />
    <Swiper
      // install Swiper modules
      modules={[Navigation, Pagination, Scrollbar, A11y, Autoplay]}
      spaceBetween={50}
      slidesPerView={1}
      navigation
      pagination={{ clickable: true }}
      scrollbar={{ draggable: true }}
      autoplay={{
        delay: 5000,
      }}
    >
      <SwiperSlide><Hero /></SwiperSlide>

      <SwiperSlide>
        <div className="left">
          <div className="text-center">
            <img className="mb-3" src={logo} alt="Domecek.online logo" width="240" />
            <h1 className="mb-4">Domeček.online</h1>
            <div className="lead">
              <p>Informace o aktuální spotřebě.</p>
              <p>Podpora fotovoltaiky a baterií.</p>
              <p>Integrace s Loxone.</p>
            </div>
          </div>
        </div>
        <img src={graphs1} className="right"/>
      </SwiperSlide>

      <SwiperSlide>
        <div className="left">
          <div className="text-center">
            <img className="mb-3" src={logo} alt="Domecek.online logo" width="240" />
            <h1 className="mb-4">Domeček.online</h1>
            <div className="lead">
              <p>Denní a měsíční statistiky.</p>
              <p>Pravidelná hlášení na email.</p>
            </div>
          </div>
        </div>
        <img src={graphs} className="right"/>
      </SwiperSlide>

      <SwiperSlide>
        <div className="left">
          <div className="text-center">
            <img className="mb-3" src={logo} alt="Domecek.online logo" width="240" />
            <h1 className="mb-4">Domeček.online</h1>
            <div className="lead">
              <p>Upozornění na nenadálé situace a poruchy prostřednictvím SMS nebo Emailu:</p>
              <p>Únik vody, otevřená vrata, porucha nabíjení elektromobilu, nízká teplota v domě, ...</p>
            </div>
          </div>
        </div>
        <img src={graphs} className="right"/>
      </SwiperSlide>
    </Swiper>
    <Content />
    </div>
  </Fragment>
);

export default Home;
