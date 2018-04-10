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

    var queryUrl = token.instance_url + "/services/data/v41.0" + apiEndpoint;
    var options =  {
      headers: {
        Authorization: 'Bearer ' + oauth.getAccessToken()
      }
    }

    try {
      var response = UrlFetchApp.fetch(queryUrl,options);
    } catch (e) {
      return {
        error: e.message,
      }
    }

    var queryResult = Utilities.jsonParse(response.getContentText());
    return queryResult;
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
