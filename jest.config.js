/** @returns {Promise<import('jest').Config>} */
module.exports = async () => {
  return {
    transformIgnorePatterns: ["node_modules/(?!swiper|ssr-window|dom7).*/"],
    "moduleNameMapper": {
      "swiper/css": "swiper/swiper.min.css",
      "swiper/react": "swiper/swiper-react.mjs",
      "swiper/modules": "swiper/modules/index.mjs"
    },
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
        ".+\\.(svg|css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$": "jest-transform-stub"
    },
    verbose: true,
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.js"],
    "collectCoverage": true
  };
};
