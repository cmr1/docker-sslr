'use strict';

// Require the base Hook class
const Hook = require('./hook');

/**
 * HookDns class
 * Dehydrated hook for 'dns-01' challenge type
 */
class HookDns extends Hook {

  /**
   * Deploy challenge as DNS record
   */
  deployChallenge() {
    this.debug('Deploying challenge...');

    // Retrieve the challenge record set from Route53
    this.getChallengeRecordSet(recordSet => {

      // Upsert (update or insert) the record set
      recordSet.upsert(() => {
        this.log('Challenge deployed.');
      });
    });
  }

  /**
   * Clean challenge from DNS
   */
  cleanChallenge() {
    this.debug('Cleaning challenge...');

    // Retrieve the challenge record set from Route53
    this.getChallengeRecordSet(recordSet => {

      // Delete the record set
      recordSet.delete(() => {
        this.debug('Challenge cleaned.');
      });
    });
  }

  /**
   * Get the challenge record set for this hook execution
   */
  getChallengeRecordSet(callback) {

    // Get the hosted zone for this domain
    this.getHostedZone(this.domain, zone => {

      // Create a new RecordSet object (can be used to create/update & delete)
      const recordSet = zone.newRecordSet({
        Name: `_acme-challenge.${this.domain}.`,  // Subdomain expected by ACME CA
        Type: 'TXT',                              // DNS challenge is a TXT record 
        TTL: 0,                                   // Set TTL to 0
        ResourceRecords: [                        // Define the records (values) for this record set
          {
            Value: `"${this.challenge}"`          // The value is simply the challenge string
          }
        ]
      });

      // Return the callback with the created record set
      return callback(recordSet);
    });
  }
}

// Export the HookDns class
module.exports = HookDns;
