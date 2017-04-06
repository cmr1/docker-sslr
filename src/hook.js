'use strict';

// Require fs, dns, path, and async
const fs = require('fs-extra');
const dns = require('dns');
const path = require('path');
const async = require('async');

// Require global config and log config
const config = require(path.join(__dirname, '..', 'config'));
const logConfig = require(path.join(__dirname, '..', 'config', 'logging'));

// Require cmr1-logger to extend from
const Logger = require('cmr1-logger');

// Require cmr1-aws to use for Route53 access
const cmr1aws = require('cmr1-aws');
/**
 * Hook class
 * Base dehydrated hook
 */
class Hook extends Logger {
  /**
   * Constructor - Build a Hook object
   */
  constructor() {
    // Call Logger constructor with options from current running listener
    super(config);

    // Enable logging based on hook config
    this.enableLogging(logConfig);

    // Create a route53 object for this hook
    this.route53 = new cmr1aws.Route53();

    // Get CLI arguments (from dehydrated hook execution)
    const args = Object.assign([], process.argv);

    // First argument is the binary for NodeJS (/usr/bin/node)
    this.executable = args.shift();

    // Second argument is the filepath (/path/to/this/file)
    this.filepath = args.shift();

    // After shifting the first two arguments, the remaining ones are sent from dehydrated

    // These two arguments should always be present
    this.stage = args[0];       // Get the stage of this hook execution
    this.domain = args[1];      // Get the domain for this hook execution

    // These arguments should be present during the deploy & clean challenge stages
    this.token = args[2];       // Get the token for this hook execution
    this.challenge = args[3];   // Get the challenge for this hook execution

    // These arguments should be present during the deploy cert stage
    this.pem_files = {          // Get the pem files (file paths) for this hook execution
      privkey: args[2],
      cert: args[3],
      fullchain: args[4],
      chain: args[5]
    };

    // Show debug message about this hook
    this.debug('Hook constructed:', JSON.stringify(this, null, 2));
  }

  /**
   * Run the current hook
   */
  run() {

    // Validate this hook before running
    this.validate();

    // Switch on the stage of the hook execution
    switch(this.stage) {

      // Run deploy challenge stage
      case 'deploy_challenge':
        this.verifyOwnership(error => {
          if (error) { 
            this.error(error)
          } else {
            this.deployChallenge();            
          }
        });

        break;

      // Run clean challenge stage
      case 'clean_challenge':
        this.cleanChallenge();
        break;

      // Run deploy cert stage
      case 'deploy_cert':
        this.deployCert();
        break;
    
      // Run unchanged cert stage
      //  - Cert has already been obtained, and isn't expiring within dehydrated threshold to renew
      case 'unchanged_cert':
        this.log(`Cert for domain: '${this.domain}' is unchanged.`);
        this.copyCert();
        break;

      // Run invalid challenge stage
      //  - Challange verification failed
      case 'invalid_challenge':
        this.error(`Invalid hooked challenge for domain: ${this.domain}`);
        break;

      // Run request failure stage
      case 'request_failure':
        this.error(`Hook request failure for domain: ${this.domain}`);
        break;

      // Run exit hook stage
      case 'exit_hook':
        process.exit();
        break;

      // Unknown stage
      default:
        this.warn('Unknown stage:', this.stage);
        break;
    }
  }

  /**
   * Verify the existence and validity of required arguments
   */
  validate(callback) {

    // Verify stage exists
    if (typeof this.stage === 'undefined') {
      this.error('No stage provided to hook!');
    }

    // Verify domain is valid
    if (!config.validateDomain(this.domain)) {
      this.error(`Invalid domain passed to hook: ${this.domain}`);
    }
  }

  /**
   * Placeholder ("abstract") method definition for deployChallenge
   * This should be implemented by subclass(es)
   */
  deployChallenge() {
    this.error('Must implement deployChallenge() in extended class(es)!');
  }

  /**
   * Placeholder ("abstract") method definition for cleanChallenge
   * This should be implemented by subclass(es)
   */
  cleanChallenge() {
    this.error('Must implement cleanChallenge() in extended class(es)!');
  }

  /**
   * Deploy certs
   *  - Certs already exist in dehydrated/certs directory at this point
   */
  deployCert() {
    this.log('Deploying cert...');

    // Copy certs
    this.copyCert();
  } 

  /**
   * Verify ownership of current subject (domain)
   * @param {callback} callback - Callback when ownership is verified
   */
  verifyOwnership(callback) {

    // Get the hosted zone for this domain
    this.getHostedZone(this.domain, zone => {
      this.log('Verifying ownership of domain:', this.domain, zone);
    
      // Lookup record for zone.Name instead
      zone.getRecordSets({ StartRecordName: zone.Name, StartRecordType: 'NS' }, recordSets => {
        this.debug(recordSets);

        if (recordSets.length > 0) {
          const expectedNs = recordSets[0].ResourceRecords.map(r => { return r.Value.substr(0, r.Value.length-1) });
          const expectedStr = expectedNs.sort().join(',');

          this.log('Expected NS records from Route53:', expectedStr);

          // Resolve zone.Name instead
          dns.resolveNs(zone.Name.substr(0, zone.Name.length-1), (err, actualNs) => {
            if (err) {
              return callback(err);
            }

            const actualStr = actualNs.sort().join(',');

            this.log('Actual NS records from DNS:', actualStr);

            if (expectedStr === actualStr) {
              return callback();
            }

            return callback(`Unable to verify NS records. Expected: '${expectedStr}' | Actual: '${actualStr}'`);
          });
        } else {
          return callback(`No NS record sets found for domain: '${this.domain}'`);
        }
      });
    });
  }

  /**
   * Get hosted zone by
   * @param {string} host - Hostname to search for zone
   * @param {callback} callback - Callback when zone is found
   */
  getHostedZone(host, callback) {

    // Search Route53 by name for host
    this.route53.getZoneByName(host, zone => {

      // If a zone was found, return it (using callback)
      if (zone) {
        callback(zone);

      // Otherwise, try to find potential parent zone
      } else {
        this.log(`Missing zone for host: '${host}'`);

        // Split host (domain) into array
        const hostParts = host.split('.');

        // Verify we're not yet at host apex
        if (hostParts.length > 2) {
          // Get subDomain and parentDomain from array
          const subDomain = hostParts.shift();
          const parentDomain = hostParts.join('.');

          this.log(`Trying parent domain: '${parentDomain}' (without subdomain: '${subDomain}')`);

          // Attempt to find hosted zone for parent domain (host)
          this.getHostedZone(parentDomain, callback);

        // Otherwise, we were unable to find the hosted zone for host
        } else {
          this.error(`Unable to find a zone for host: '${host}' (scanned to apex)`);
        }
      }
    });
  }

  /**
   * Copy cert files 
   *  - Only if the 'copy_cert_dir' option is set
   */
  copyCert() {
    this.debug(this.pem_files);

    // Only if the out option was set with last running listener
    if (config.output_dir && config.output_dir.trim() !== '') {
      this.log(`Copying to: ${config.output_dir}`);

      // Verify existence of dir
      fs.ensureDir(config.output_dir, err => {

        // Only proceed without errors
        if (!err) {
          this.log('Copying files to:', config.output_dir);       

          // For each pem file (key & cert/chain), copy to new directory
          async.each([ this.pem_files.privkey, this.pem_files.fullchain ], (filepath, next) => {
            // Get filename info from pem path.
            var matches = filepath.match(/.*\/([^\/]+)\/([^\/]+)\.pem/);

            // Create variables for matches
            const hostname = matches[1];
            const filetype = matches[2];

            // Build filename for destination file
            const copyfile = hostname + '.' + (filetype === 'privkey' ? 'key' : 'crt');

            // Build destination copy path
            const copypath = path.join(config.output_dir, copyfile);

            // Stream contents of pem file to destination file
            fs.createReadStream(filepath).pipe(fs.createWriteStream(copypath));

            // Show copied message
            this.log(`Copied file: ${filepath} -> ${copypath}`);

            // Update permissions and exec "next" callback (for async.each)
            fs.chmod(copypath, 0o644, next);
          }, err => {
            // Error copying files
            if (err) this.error(err);

            // Finished copying cert files
            this.log('Hook.deployCert() - copy cert files finished.');
          });
        }
      });
    }
  }
}

// Export the Hook class
module.exports = Hook;
