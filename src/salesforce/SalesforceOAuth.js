/* global OAuth2 */

const SALESFORCE_TOKEN_TIMEOUT_SECONDS = 2 * 60 * 60; // tokens are valid for 2 hours
const SALESFORCE_TOKEN_TIMEOUT_BUFFER = 60; // seconds

class SalesforceOAuth {
  constructor(
    sfConsumerKey = PropertiesService.getScriptProperties().getProperty('SALESFORCE_CONSUMER_KEY'),
    sfConsumerSecret = PropertiesService.getScriptProperties().getProperty('SALESFORCE_CONSUMER_SECRET'),
  ) {
    this.sfConsumerKey = sfConsumerKey;
    this.sfConsumerSecret = sfConsumerSecret;

    if (!this.sfConsumerKey || !this.sfConsumerSecret) {
      throw new Error('Set SALESFORCE_CONSUMER_KEY and SALESFORCE_CONSUMER_SECRET in Script Properties');
    }
  }

  service() {
    return OAuth2.createService('salesforce')
      // Set the endpoint URLs, which are the same for all sfdc services.
      .setAuthorizationBaseUrl('https://login.salesforce.com/services/oauth2/authorize')
      .setTokenUrl('https://login.salesforce.com/services/oauth2/token')
      .setClientId(this.sfConsumerKey)
      .setClientSecret(this.sfConsumerSecret)
      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('salesforceAuthCallback')
      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
  }

  token() {
    const oauth = this.service();
    const token = oauth.getToken();

    if (!oauth.hasAccess()) {
      throw new Error('No Salesforce OAuth. Run salesforceAuthorize function again.');
    }

    // refresh the access token if necessary
    // we manually have to check for token expiry since the salesforce token
    // doesn't have an "expires_in" field
    const now = Math.floor(new Date().getTime() / 1000);
    const isTokenExpired =
      (token.granted_time + SALESFORCE_TOKEN_TIMEOUT_SECONDS) - now <
      SALESFORCE_TOKEN_TIMEOUT_BUFFER;

    if (isTokenExpired) {
      oauth.refresh();
    }

    return oauth.getAccessToken();
  }
}

module.exports = SalesforceOAuth;
