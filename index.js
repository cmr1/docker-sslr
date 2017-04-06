'use strict';

// Require global config and log config
const config = require('./config');

const Sslr = require('./src/sslr');

const sslr = new Sslr();

sslr.run((err, domains) => {
  if (err) {
    console.error('FAILED!', err);
    process.exit(1);
  } else {
    console.log('SUCCESS!', domains);
  }
});