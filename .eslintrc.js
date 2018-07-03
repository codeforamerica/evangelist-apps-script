module.exports = {
  "extends": "airbnb-base",
  "plugins": [
    "googleappsscript",
    "jasmine",
  ],
  "env": {
    "googleappsscript/googleappsscript": true,
    "jasmine": true,
  },
  "rules": {
    "no-console": 0, // console.log is our best logging method
  }
};
