/* global OAuth2 */
declare var global: {
  salesforceAuthorize: () => void
  salesforceUnauthorize: () => void
  salesforceAuthCallback: (any) => any // actually HtmlOutput
};
declare var OAuth2: {
  authorizationUrl: any
  createService: any
};

const SalesforceClient = require('./salesforce/SalesforceClient');

function salesforceGetService() {
  const sfConsumerKey = PropertiesService.getScriptProperties().getProperty('SALESFORCE_CONSUMER_KEY');
  const sfConsumerSecret = PropertiesService.getScriptProperties().getProperty('SALESFORCE_CONSUMER_SECRET');

  if (!sfConsumerKey || !sfConsumerSecret) {
    Logger.log('Set SALESFORCE_CONSUMER_KEY and SALESFORCE_CONSUMER_SECRET in Script Properties');
    return null;
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
    .setPropertyStore(PropertiesService.getUserProperties());
}

interface SalesforceBrigadePrimaryContact {
  Name: string;
  Email: string;
}

export interface SalesforceBrigade {
  Id: string;
  Name: string;
  Brigade_Type__c: string;
  Brigade_Status__c: string;
  npe01__One2OneContact__r: SalesforceBrigadePrimaryContact | null;
  Brigade_Public_Email__c: string;
  Website: string;
  Site_Link__c: string;
  MeetUp_Link__c: string;
  MeetUp_Group_ID__c: string;
  Brigade_Location__c: string;
  Organization_Twitter__c: string;
  Github_URL__c: string;
  Facebook_Page_URL__c: string;
  Brigade_Region__c: string;
  RecordTypeId: string;
}

function salesforceListBrigades() {
  const soql = 'SELECT Id, Name, Brigade_Type__c, Brigade_Status__c, npe01__One2OneContact__r.Name, npe01__One2OneContact__r.Email, Brigade_Public_Email__c, Website, Site_Link__c, MeetUp_Link__c, MeetUp_Group_ID__c, Brigade_Location__c, Organization_Twitter__c, Github_URL__c, Facebook_Page_URL__c, Brigade_Region__c, RecordTypeId' +
    " FROM Account WHERE RecordTypeId = '012d0000001YapjAAC' ORDER BY Name";
  const client = new SalesforceClient();
  return client.query(soql);
}

function salesforceListDonations() {
  const soql = 'SELECT Account.Name, Account.Type, Account.npe01__One2OneContact__r.Name, Account.npe01__One2OneContact__r.Email, Amount, Brigade_Designation_lookup__r.Name, Description, CloseDate FROM Opportunity WHERE Brigade_Designation_lookup__c != null ORDER BY CloseDate DESC NULLS FIRST';
  const client = new SalesforceClient();
  return client.query(soql);
}

function salesforceListBrigadeLeaders() {
  const soql = "SELECT npe5__Contact__r.Name, npe5__Contact__r.Email, npe5__Organization__r.Name, CreatedDate FROM npe5__Affiliation__c WHERE Captain_Co_Captain__c = TRUE AND IsDeleted = FALSE AND npe5__Status__c = 'Current'";
  const client = new SalesforceClient();
  return client.query(soql);
}

function salesforceListBrigadeAffiliations() {
  // Sometimes Account.Type is empty(?!?), to be extra safe let's fall back to
  // our custom field.
  const soql = "SELECT Id, npe5__Contact__c, npe5__Contact__r.Name, npe5__Contact__r.Meetup_User_ID__c, npe5__Organization__c, npe5__Organization__r.Name FROM npe5__Affiliation__c WHERE npe5__Organization__r.RecordTypeId = '012d0000001YapjAAC' AND Source__c = 'Meetup'";
  const client = new SalesforceClient();
  return client.query(soql);
}

function salesforceAuthorize() {
  const oauth = salesforceGetService();
  if (oauth.hasAccess()) {
    Logger.log("Looks like you've got access already!");
  } else {
    const authorizationUrl = oauth.getAuthorizationUrl();
    const template = HtmlService.createTemplate('<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Reopen the sidebar when the authorization is complete.');
    // @ts-ignore
    template.authorizationUrl = authorizationUrl;
    const page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  }
}
global.salesforceAuthorize = salesforceAuthorize;

// handy function to test salesforce in the IDE:
function salesforceUnauthorize() {
  const oauth = salesforceGetService();
  oauth.reset();
}
global.salesforceUnauthorize = salesforceUnauthorize;

function salesforceAuthCallback(request) {
  const service = salesforceGetService();
  const isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  }
  return HtmlService.createHtmlOutput('Denied. You can close this tab');
}
global.salesforceAuthCallback = salesforceAuthCallback;

export {
  salesforceListBrigades,
  salesforceListDonations,
  salesforceListBrigadeLeaders,
  salesforceListBrigadeAffiliations,
};
