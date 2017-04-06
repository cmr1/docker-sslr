'use strict';

// Require path and build path related constants
const fs = require('fs-extra');
const path = require('path');
const exec = require('child_process').exec;

// Require global config and log config
const config = require(path.join(__dirname, '..', 'config'));
const logConfig = require(path.join(__dirname, '..', 'config', 'logging'));

// Require cmr1-logger to extend from
const Logger = require('cmr1-logger');

/**
 * SSLer Dehydrator
 */
class Dehydrator extends Logger {

  /**
   * Constructor - Create Dehydrator object
   */
  constructor() {
    // Call Logger constructor with options from current running listener
    super(config);

    // Enable logging based on hook config
    this.enableLogging(logConfig);
  }

  /**
   * Dehydrate (execute dehydrated binary) for given message
   * @param {array} domains - Domains to dehydrate (obtain SSL certs for)
   * @param {string} challenge_type - Challenge type ("http-01" or "dns-01")
   * @param {string} challenge_hook - Challenge hook (depends on challenge_type)
   * @param {callback} callback - Callback after completion is finished
   */
  run(domains, challenge_type, challenge_hook, callback) {
    let bin = `${config.dehydrated_path}/dehydrated`;
    let cfg = `${config.dehydrated_path}/config`;
    let cmd = `${bin} --accept-terms -n -c -t ${challenge_type} -k ${challenge_hook} -f ${cfg}`;

    if (domains !== false) {
      // Build dehydrated command
      cmd += ` -d ${domains.join(' -d ')}`;

      // Log notification of attempt to obtain SSL for given domains
      this.log(`Obtaining SSL using challenge: '${challenge_type}' for domain(s): '${domains.join(', ')}'`);
    } else {
      // Fail silently (not fatal) so we can finish processing in cron mode
      cmd += ' -g';
    }

    // Debug output
    this.debug(`Running command: "${cmd}"`);

    // Execute dehydrated command
    exec(cmd, (error, stdout, stderr) => {

      // If there is an error, return callback with that error
      if (error) {
        return callback(error);
      }

      // Show stdout as debug (verbose only)
      this.debug(`\n${stdout}`);

      // If stderr is not empty, show it as warning
      if (stderr.trim() !== '') {
        this.warn(`\n${stderr}`);
      }

      if (domains !== false) {
        // Build vars to use to track domain(s)
        const domainList = `${config.dehydrated_path}/domains.txt`;
        const domainLine = domains.join(' ');

        fs.ensureFile(domainList, err => {
          if (err) {
            this.warn(`Unable to ensure file exists for domain list: ${domainList}`);

            this.finalize(domains, callback);

          // Check if the domain(s) have already been tracked in the domains txt file
          } else if (this.fileHasLine(domainList, domainLine)) {
            this.debug(`Domains: ${domainLine} already tracked in file: ${domainList}`);
            this.finalize(domains, callback);
          } else {
            // Append domain(s) from message to dehydrated domains list
            fs.writeFile(domainList, `${domainLine}\n`, { flag: 'a' }, err => {

              // If there was an error writing the file, return callback with that error
              if (err) {
                return callback(err);
              }

              // Debug notification about appending domains to domain list
              this.debug(`Appended domains: '${domainLine}' to file: '${domainList}'`);

              // Finialize dehydrating this message
              this.finalize(domains, callback);
            });
          }
        });
      } else {
        return callback();
      }
    });
  }

  /**
   * Finalize dehydration of a message
   * @param {array} domains - Domains to finialize dehydration for
   * @param {callback} callback - Callback after completion is finished
   */
  finalize(domains, callback) {
    // Success notification when process is complete
    this.success(`SSL Cert files obtained for domain(s): ${domains.join(', ')}`);                  

    // Return the callback
    return callback();
  }

  /**
   * Check if a line is present in a file
   * @param {string} file - File path for file to check for line
   * @param {string} line - Line to search for within file
   */
  fileHasLine(file, line) {
    // Read the file and split into array of lines
    const lines = fs.readFileSync(file, 'utf-8').split('\n');

    // Check if the line exists in the array of lines
    return lines.indexOf(line) !== -1;
  }
}

// Export the Dehydrator class
module.exports = Dehydrator;
