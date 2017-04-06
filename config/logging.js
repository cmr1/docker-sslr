'use strict';

// Export config
module.exports = {
  "log": {
    "stamp": true,
    "prefix": "",
    "color": "white"
  },
  "warn": {
    "stamp": true,
    "throws": false,
    "prefix": "WARN:",
    "color": "yellow"
  },
  "error": {
    "stamp": true,
    "throws": true,
    "prefix": "ERROR:",
    "color": "red"
  },
  "debug": {
    "stamp": true,
    "verbose": true,
    "prefix": "DEBUG:",
    "color": "cyan"
  },
  "success": {
    "stamp": true,
    "prefix": "SUCCESS:",
    "color": "green"
  },
  "info": {
    "prefix": "INFO:",
    "color": "cyan"
  }
};
