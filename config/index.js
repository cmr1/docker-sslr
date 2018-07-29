'use strict';

const path = require('path');
const ROOT_PATH = path.join(__dirname, '..');

// Define challenge related constants
const CHALLENGE_HTTP = 'http-01';
const CHALLENGE_DNS = 'dns-01';

// Create array of available challenge types (first is default)
const AVAILABLE_CHALLENGES = [ CHALLENGE_DNS, CHALLENGE_HTTP ];
const CHALLENGE_HOOK_PREFIX = `${ROOT_PATH}/bin/hook`;
const CHALLENGE_HOOK_DNS = `${CHALLENGE_HOOK_PREFIX}-${CHALLENGE_DNS}`;
const CHALLENGE_HOOK_HTTP = `${CHALLENGE_HOOK_PREFIX}-${CHALLENGE_HTTP}`;

// Define generic constant for a valid domain regex
const REGEX_VALID_DOMAIN = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

// Export config
module.exports = {
// Set timeout (defaults to 10 minutes)
  verbose: process.env.VERBOSE === 'true',
  timeout: process.env.TIMEOUT || 600000,
  env: process.env.APP_ENV || 'development',
  output_dir: process.env.OUTPUT_DIR || '',
  output_s3: process.env.OUTPUT_S3 || '',
  output_acm: process.env.OUTPUT_ACM || '',
  dehydrated_path: process.env.DEHYDRATED_PATH || '/etc/dehydrated',
  challenge_webroot: process.env.CHALLENGE_WEBROOT || '/var/www/acme',
  challenge_type: process.env.CHALLENGETYPE || AVAILABLE_CHALLENGES[0],
  constants: {
    ROOT_PATH,
    CHALLENGE_HTTP,
    CHALLENGE_DNS,
    AVAILABLE_CHALLENGES,
    CHALLENGE_HOOK_PREFIX,
    CHALLENGE_HOOK_DNS,
    CHALLENGE_HOOK_HTTP,
    REGEX_VALID_DOMAIN
  },
  validateDomain: function(domain) {
    return REGEX_VALID_DOMAIN.test(domain);
  },
  getHookByType: function(type) {
    return `${CHALLENGE_HOOK_PREFIX}-${type}`
  }
};
