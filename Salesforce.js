function salesforceGetService() {
  var sfConsumerKey = ScriptProperties.getProperty("SALESFORCE_CONSUMER_KEY");
  var sfConsumerSecret = ScriptProperties.getProperty("SALESFORCE_CONSUMER_SECRET");

  if (!sfConsumerKey || !sfConsumerSecret) {
    Logger.log("Set SALESFORCE_CONSUMER_KEY and SALESFORCE_CONSUMER_SECRET in Script Properties");
    return;
  }

  return OAuth2.createService('salesforce')
      // Set the endpoint URLs, which are the same for all sfdc services.
      .setAuthorizationBaseUrl('https://login.salesforce.com/services/oauth2/authorize')
      .setTokenUrl('https://login.salesforce.com/services/oauth2/token')
      .setClientId(sfConsumerKey)
      .setClientSecret(sfConsumerSecret)
      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('salesforceAuthCallback')
      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())
}

function salesforceRequest(apiEndpoint) {
  var requestUri = "/services/data/v41.0" + apiEndpoint;

  return salesforceRequestRaw('GET', requestUri);
}

function importMeetup() {
  var contactsToCreateCSV = "Meetup_User_ID__c,FirstName,LastName,Email,MC_Brigade_Newsletter__c,Program_Interest_Brigade__c\n" +
    "104952772000,Tom Test,Dooner,tomdooner+test@gmail.com,TRUE,TRUE\n"

  var jobResults = salesforceBulkUpsert('Contact', 'Email', contactsToCreateCSV);
}

/*
 * @param object {String} Name of object to upsert
 * @param externalIdFieldName {String} The name of the field to use as an
 *   external ID to find records that already exist. This can be Id, Email, or
 *   any custom defined external IDs for that object.
 * @param csv {String} The CSV of records to upsert.
 */
function salesforceBulkUpsert(object, externalIdFieldName, csv) {
  var response,
      jobId,
      jobFinished = false,
      jobResults = {};

  console.log("Starting Salesforce Bulk Upsert (object = " + object + "; externalIdFieldName = " + externalIdFieldName + "; csv = " + csv.length + " bytes)");

  // 1. create upsert batch
  response = salesforceRequestRaw('POST', '/services/data/v41.0/jobs/ingest',
    { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    JSON.stringify({
      "object": object,
      "operation" : "upsert",
      "contentType" : "CSV",
      "externalIdFieldName": externalIdFieldName
    })
  );

  if (response.error) {
    return { error: "Error creating Bulk API Job: " + response.error };
  } else {
    jobId = response.id;
  }

  // 2. Add a batch to that job
  response = salesforceRequestRaw('PUT', '/services/data/v41.0/jobs/ingest/' + jobId + '/batches',
    { 'Content-Type': 'text/csv', 'Accept': 'application/json' },
    csv
  );

  if (response.error) {
    return { error: "Got error when creating job batch: " + response.error };
  }

  // 3. Close the job so it starts!
  response = salesforceRequestRaw('PATCH', '/services/data/v41.0/jobs/ingest/' + jobId,
                                  { 'Content-Type': 'application/json' },
                                  JSON.stringify({ 'state': 'UploadComplete' }));

  // 4. Poll until complete
  while (!jobFinished) {
    Utilities.sleep(1000);
    response = salesforceRequestRaw('GET', '/services/data/v41.0/jobs/ingest/' + jobId,
                                    { 'Content-Type': 'application/json; charset=UTF-8', 'Accept': 'application/json' });
    jobFinished = ['Aborted', 'JobComplete', 'Failed'].indexOf(response.state) !== -1;
  }

  jobResults['success'] = response.state === 'JobComplete';
  jobResults['totalProcessingTime'] = response.totalProcessingTime;
  jobResults['numberRecordsFailed'] = response.numberRecordsFailed;
  jobResults['numberRecordsProcessed'] = response.numberRecordsProcessed;

  // 5. Fetch successful results
  response = salesforceRequestRaw('GET', '/services/data/v41.0/jobs/ingest/' + jobId + '/successfulResults/',
                                  { 'Content-Type': 'application/json; charset=UTF-8', 'Accept': 'text/csv' })

  jobResults['successfulResults'] = _csvRowsToJSON(Utilities.parseCsv(response));

  // 6. Fetch failed results
  response = salesforceRequestRaw('GET', '/services/data/v41.0/jobs/ingest/' + jobId + '/failedResults/',
                                  { 'Content-Type': 'application/json; charset=UTF-8', 'Accept': 'text/csv' })
  jobResults['failedResults'] = _csvRowsToJSON(Utilities.parseCsv(response));

  console.log("Finished Salesforce Bulk Upsert. (Failed = " + jobResults.numberRecordsFailed + "; Took = " + jobResults.totalProcessingTime + ")");

  return jobResults;
}

// Temporarily (?) provide a more raw API for making requests to support both "data" and "async" types of requests.
function salesforceRequestRaw(method, requestUri, headers, payload) {
  var headers = headers || {};
  var oauth = salesforceGetService();
  var token = oauth.getToken();

  if (oauth.hasAccess()) {
    // manually check for token expiry since the salesforce token doesn't have
    // an "expires_in" field
    var SALESFORCE_TOKEN_TIMEOUT_SECONDS = 2 * 60 * 60; // tokens are valid for 2 hours
    var SALESFORCE_TOKEN_TIMEOUT_BUFFER = 60 // seconds
    var now = Math.floor(new Date().getTime() / 1000);
    if (token.granted_time + SALESFORCE_TOKEN_TIMEOUT_SECONDS - now < SALESFORCE_TOKEN_TIMEOUT_BUFFER) {
      oauth.refresh();
    }

    var options =  {
      method: method.toLowerCase(),
      headers: Object.assign({
        Authorization: 'Bearer ' + oauth.getAccessToken()
      }, headers),
      payload: payload
    }

    try {
      var response = UrlFetchApp.fetch(token.instance_url + requestUri, options);
      var responseHeaders = response.getHeaders();
    } catch (e) {
      return {
        error: e.message,
      }
    }

    if (responseHeaders['Content-Type'] && responseHeaders['Content-Type'].indexOf('application/json') === 0) {
      var queryResult = Utilities.jsonParse(response.getContentText());
      return queryResult;
    } else {
      return response.getContentText();
    }
  } else {
    return {
      "error": "No Salesforce OAuth. Run salesforceAuthorize function again."
    }
  }
}

function salesforceListBrigades() {
  var soql = "SELECT Id, Name, Brigade_Type__c, Brigade_Status__c, npe01__One2OneContact__r.Name, npe01__One2OneContact__r.Email, Brigade_Public_Email__c, Website, Site_Link__c, MeetUp_Link__c, Brigade_Location__c, Organization_Twitter__c, Github_URL__c, Facebook_Page_URL__c" +
    " FROM Account WHERE Brigade_Type__c = 'Brigade' ORDER BY Name";
  var response = salesforceRequest('/query?q=' + encodeURIComponent(soql));

  if (response.error) {
    Logger.log("ERROR: " + response.error);
    return;
  }

  return response.records;
}

function salesforceListDonations() {
  var soql = "SELECT Account.Name, Account.Type, Account.npe01__One2OneContact__r.Name, Account.npe01__One2OneContact__r.Email, Amount, Brigade_Designation_lookup__r.Name, Description, CloseDate FROM Opportunity WHERE Brigade_Designation_lookup__c != null ORDER BY CloseDate DESC NULLS FIRST";
  var response = salesforceRequest('/query?q=' + encodeURIComponent(soql));

  if (response.error) {
    Logger.log("ERROR: " + response.error);
    return;
  }

  return response.records;
}

function salesforceListBrigadeLeaders() {
  var soql = "SELECT npe5__Contact__r.Name, npe5__Contact__r.Email, npe5__Organization__r.Name, CreatedDate FROM npe5__Affiliation__c WHERE Captain_Co_Captain__c = TRUE AND IsDeleted = FALSE AND npe5__Status__c = 'Current'";
  var response = salesforceRequest('/query?q=' + encodeURIComponent(soql));

  if (response.error) {
    Logger.log("ERROR: " + response.error);
    return;
  }

  return response.records;
}

function salesforceAuthorize() {
  var oauth = salesforceGetService();
  if (oauth.hasAccess()) {
    Logger.log("Looks like you've got access already!");
  } else {
    var authorizationUrl = oauth.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Reopen the sidebar when the authorization is complete.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  }
}

function salesforceUnauthorize() {
  var oauth = salesforceGetService();
  oauth.reset();
}

function salesforceAuthCallback(request) {
  var service = salesforceGetService();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}
