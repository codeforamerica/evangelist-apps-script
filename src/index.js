// load Object polyfills
require('./Util.js');

const {
  importInternalSalesforceToDirectory,
  importExternalSalesforceToDirectory,
} = require('./BrigadeDatabase.js');

const {
  meetupProSyncMembersIncremental,
  meetupProSyncMembersAll,
} = require('./MeetupProSync.js');

const {
  loadSalesforceData,
  loadSalesforceDonationData,
  loadSalesforceBrigadeLeaders,
} = require('./Salesforce.js');

const {
  externalSheetSyncAll,
} = require('./ExternalSheets.js');

const {
  sendEmail,
} = require('./SendEmail.js');

// register all public methods so they can be called by Google Apps Script
global.importExternalSalesforceToDirectory = importExternalSalesforceToDirectory;
global.importInternalSalesforceToDirectory = importInternalSalesforceToDirectory;
global.meetupProSyncMembersIncremental = meetupProSyncMembersIncremental;
global.meetupProSyncMembersAll = meetupProSyncMembersAll;
global.loadSalesforceData = loadSalesforceData;
global.loadSalesforceDonationData = loadSalesforceDonationData;
global.loadSalesforceBrigadeLeaders = loadSalesforceBrigadeLeaders;
global.externalSheetSyncAll = externalSheetSyncAll;
global.sendEmail = sendEmail;
