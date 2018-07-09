const SalesforceOAuth = require('./SalesforceOAuth');
const assign = require('core-js/library/fn/object/assign');

class SalesforceClient {
  constructor() {
    this.auth = new SalesforceOAuth();
  }

  instanceUrl() {
    const token = this.auth.service().getToken();
    return token.instance_url;
  }

  /*
   * Perform a SOQL query using the REST API.
   * Handles pagination and throws an error if anything goes wrong.
   *
   * See: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm?search_text=query
   */
  query(soql) {
    let response;
    let requestUri = `/services/data/v41.0/query?q=${encodeURIComponent(soql)}`;
    let records = [];

    do {
      response = this.salesforceRequestRaw('GET', requestUri);

      if (response.error) {
        throw new Error(`ERROR fetching from Salesforce: ${response.error}`);
      }

      records = records.concat(response.records);
      requestUri = response.nextRecordsUrl;
    } while (!response.done);

    return records;
  }

  /*
   * Provide an API for making an arbitrary request to Salesforce, as opposed to
   * the salesforceRequest method which assumes a "data" endpoint.
   *
   * @param method {String} e.g. POST, GET
   * @param requestUri {String} e.g. '/services/data/v41.0/jobs/ingest'
   * @param headers {Object} Any headers to add.
   * @param payload {String} The body of the request. Make sure to set
   *   headers['Content-Type'] to match the content of the payload.
   */
  salesforceRequestRaw(method, requestUri, headers, payload) {
    const requestHeaders = headers || {};

    const options = {
      method: method.toLowerCase(),
      headers: assign({
        Authorization: `Bearer ${this.auth.token()}`,
      }, requestHeaders),
      payload,
    };

    let response;
    let responseHeaders = {};

    try {
      response = UrlFetchApp.fetch(this.instanceUrl() + requestUri, options);
      responseHeaders = response.getHeaders();
    } catch (e) {
      return {
        error: e.message,
      };
    }

    if (responseHeaders['Content-Type'] && responseHeaders['Content-Type'].indexOf('application/json') === 0) {
      const queryResult = Utilities.jsonParse(response.getContentText());
      return queryResult;
    }
    return response.getContentText();
  }
}

module.exports = SalesforceClient;
