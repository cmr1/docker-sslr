'use strict';

// Require fs and async for file processing
const fs = require('fs-extra');
const async = require('async');

// Require the base Hook class
const Hook = require('./hook');

/**
 * HookHttp class
 * Dehydrated hook for 'http-01' challenge type
 */
class HookHttp extends Hook {
  /**
   * Constructor - Build a HookHttp object
   */
  constructor() {

    // Build the parent Hook() class first
    super();

    // Build directory variables as properties of this instance
    this.domainDir = `${this.settings.challenge_webroot}/${this.domain}`;
    this.wellKnownDir = `${this.domainDir}/.well-known`;
    this.challengeDir = `${this.wellKnownDir}/acme-challenge`;
    this.challengeFile = `${this.challengeDir}/${this.token}`;
  }

  /**
   * Deploy challenge as file to be accessed via HTTP
   */
  deployChallenge() {
    this.debug('Deploying challenge...');

    // Verify or create the challenge directory (for this domain)
    fs.ensureDir(this.challengeDir, err => {

      // Show & throw error if something went wrong
      if (err) {
        this.error(err)
      }

      // Look through each directory (no recursive way to do this?) to make sure it's executable for web server to see
      async.each([ this.domainDir, this.wellKnownDir, this.challengeDir ], (dir, next) => {
        // Change each directory mode to 755 (rwx r-x r-x), needs to be executable to be viewable
        fs.chmod(dir, 0o755, next);
      }, err => {

        // Show & throw error if something went wrong
        if (err) {
          this.error(err)
        }

        // Show debug msg that permissions were successfully updated
        this.debug('Updated permissions')
      });

      // Write the challenge string to the challenge file
      fs.writeFile(this.challengeFile, this.challenge, { flag: 'w' }, err => {
   
        // Show & throw error if something went wrong
        if (err) {
          this.error(err);                                
        }

        // Verify permissions of this file (only need read, not execute on this file) (644 = rw- r-- r--)
        fs.chmodSync(this.challengeFile, 0o644);

        // Debug messages when completed
        this.debug(`Saved challenge to file: ${this.challengeFile}`);
        this.debug('Challenge deployed.');
      });
    });
  }

  /**
   * Clean challenge from the filesystem
   */
  cleanChallenge() {
    this.debug('Cleaning challenge...');

    // Delete the entire domain directory for this challenge
    fs.remove(this.domainDir, err => {

      // Show & throw error if something went wrong
      if (err) {
        this.error(err);
      }

      // Debug message when completed
      this.debug('Challenge cleaned.');
    });
  }
}

// Export the HookHttp class
module.exports = HookHttp;
