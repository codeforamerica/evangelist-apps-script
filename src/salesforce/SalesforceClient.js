const { csvRowsToJSON } = require('../Util');
const SalesforceOAuth = require('./SalesforceOAuth');

/*
 * To set up Salesforce sync, take the following steps:
 * 1. Sign up for a Developer Edition account
 * 2. Create a "Connected App" with the Callback URL set to
 *
 *    https://script.google.com/macros/d/{script_id}/usercallback
 *
 *    where {script_id} is found in File > Project properties
 * 3. Copy the App's Consumer Key and Consumer Secret into "Script Properties"
 *    in the "File > Project properties" dialog
 * 4. Run the "salesforceAuthorize" function in the "Salesforce.gs" script
 *    and click the "Authorize" link that appears in the spreadsheet.
 */
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
   * @param object {String} Name of object to insert/upsert
   * @param csv {String} The CSV of records to insert/upsert.
   * @param externalIdFieldName {String?} The name of the field to use as an
   *   external ID to find records that already exist. This can be Id, Email, or
   *   any custom defined external IDs for that object.
   * @param operation {String?} One of 'upsert' or 'insert'.
   */
  salesforceBulkRequest(object, csv, operation = 'upsert', externalIdFieldName = '') {
    let response;
    let jobFinished = false;
    const jobResults = {};

    console.log(`Starting Salesforce Bulk ${operation} (object = ${object}; externalIdFieldName = ${externalIdFieldName}; csv = ${csv.length} bytes)`);

    // 1. create upsert batch
    const params = {
      object,
      operation,
      contentType: 'CSV',
    };
    if (operation === 'upsert') {
      params.externalIdFieldName = externalIdFieldName;
    }
    response = this.salesforceRequestRaw(
      'POST', '/services/data/v41.0/jobs/ingest',
      { 'Content-Type': 'application/json', Accept: 'application/json' },
      JSON.stringify(params),
    );

    if (response.error) {
      return {
        error: `Error creating Bulk API Job: ${response.error}`,
      };
    }

    const jobId = response.id;

    // 2. Add a batch to that job
    response = this.salesforceRequestRaw(
      'PUT', `/services/data/v41.0/jobs/ingest/${jobId}/batches`,
      { 'Content-Type': 'text/csv', Accept: 'application/json' },
      csv,
    );

    if (response.error) {
      return { error: `Got error when creating job batch: ${response.error}` };
    }

    // 3. Close the job so it starts!
    response = this.salesforceRequestRaw(
      'PATCH', `/services/data/v41.0/jobs/ingest/${jobId}`,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ state: 'UploadComplete' }),
    );

    // 4. Poll until complete
    while (!jobFinished) {
      Utilities.sleep(1000);
      response = this.salesforceRequestRaw(
        'GET', `/services/data/v41.0/jobs/ingest/${jobId}`,
        { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json' },
      );
      jobFinished = ['Aborted', 'JobComplete', 'Failed'].indexOf(response.state) !== -1;
    }

    jobResults.success = response.state === 'JobComplete';
    jobResults.errorMessage = response.errorMessage;
    jobResults.totalProcessingTime = response.totalProcessingTime;
    jobResults.numberRecordsFailed = response.numberRecordsFailed;
    jobResults.numberRecordsProcessed = response.numberRecordsProcessed;

    // 5. Fetch successful results
    response = this.salesforceRequestRaw(
      'GET', `/services/data/v41.0/jobs/ingest/${jobId}/successfulResults/`,
      { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'text/csv' },
    );

    jobResults.successfulResults = csvRowsToJSON(Utilities.parseCsv(response));

    // 6. Fetch failed results
    response = this.salesforceRequestRaw(
      'GET', `/services/data/v41.0/jobs/ingest/${jobId}/failedResults/`,
      { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'text/csv' },
    );
    jobResults.failedResults = csvRowsToJSON(Utilities.parseCsv(response));
    console.log(`Finished Salesforce Bulk ${operation}. (Processed = ${jobResults.numberRecordsProcessed}; Failed = ${jobResults.numberRecordsFailed}; Took = ${jobResults.totalProcessingTime})`);

    return jobResults;
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
      headers: Object.assign({
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
