'use strict';

// Require path and build path related constants
const path = require('path');

// Require global config and log config
const config = require(path.join(__dirname, '..', 'config'));
const logConfig = require(path.join(__dirname, '..', 'config', 'logging'));

// Require cmr1-logger to extend from
const Logger = require('cmr1-logger');

// Require Dehydrator
const Dehydrator = require('./dehydrator');

/**
 * Sslr
 */
class Sslr extends Logger {

  /**
   * Constructor - Create a Listener object
   */
  constructor() {
    super(config);
    this.enableLogging(logConfig);

    this.dehydrator = new Dehydrator();
  }

  /**
   * Run this listener
   */
  run(callback) {
    if (!process.env.DOMAINS) {
      console.error('No domains provided!');
      process.exit(1);
    }

    this.log('Processing domains:', process.env.DOMAINS);

    const domains = process.env.DOMAINS.replace(/\s/g, '').toLowerCase().split(',');

    const validDomains = domains.filter(d => {
      return config.validateDomain(d);
    });

    if (validDomains.length !== domains.length) {
      this.warn('Valid domain count doesnt match provided domain count', validDomains, domains);
    }

    // "dehydrate" the message (obtain SSL certs for domains attached to that message)
    this.dehydrator.run(validDomains, config.challenge_type, config.getHookByType(config.challenge_type), err => {

      // Something went wrong with the dehydration...
      if (err) {
        this.warn(err);

        // If we failed with http-01 challenge, try again with dns-01 challenge (doesn't require public facing server)
        if (config.challenge_type === config.constants.CHALLENGE_HTTP) {

          // Show another warning explaining the retry-scenario
          this.warn(`Unable to obtain SSL with challenge type: ${config.constants.CHALLENGE_HTTP}, attempting to use challenge: ${config.constants.CHALLENGE_DNS}`);

          // "dehydrate" the message again, but with the dns-01 challenge type & hook
          this.dehydrator.run(validDomains, config.constants.CHALLENGE_DNS, config.constants.CHALLENGE_HOOK_DNS, err => {

            // If this also fails, then failed to obtain SSL for the current message
            if (err) {

              // Show warnings with error and message content
              this.warn(err);
              return callback(err);
            } else {
              return callback(null, validDomains);
            }
          });

        // Failed non-http-01 challenge type, no fallback. Unable to obtain SSL for message
        } else {
          // Show a warning about this error
          // this.warn(err);
          return callback(err);
        }
      } else {
        return callback(null, validDomains);
      }
    });
  }

  /**
   * Run listener in cron mode
   * @param {callback} callback - Callback when complete
   */
  cron(callback) {

    // Running dehydrator with false as first argument, it will run on all domains in domains.txt 
    this.dehydrator.run(false, config.challenge_type, config.getHookByType(config.challenge_type), callback);
  }
}

// Export the Sslr object
module.exports = Sslr;
