import initFontAwesome from "./utils/initFontAwesome";

// Init fonts
initFontAwesome();

// Test mocks
require("jest-fetch-mock").enableMocks();

jest.mock('swiper/react', () => ({
  Swiper: (props) => null,
  SwiperSlide: (props) => null,
}))

jest.mock('swiper/modules', () => ({
  Navigation: (props) => null,
  Pagination: (props) => null,
  Scrollbar: (props) => null,
  A11y: (props) => null,
}))


import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });
