// load Object polyfills
require('./Util.js');

const {
  discourseSyncBrigadeList,
} = require('./Discourse.js');

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
} = require('./Code.js');

const {
  externalSheetSyncAll,
} = require('./ExternalSheets.js');

const {
  sendEmail,
} = require('./SendEmail.js');

// register all public methods so they can be called by Google Apps Script
global.discourseSyncBrigadeList = discourseSyncBrigadeList;
global.externalSheetSyncAll = externalSheetSyncAll;
global.importExternalSalesforceToDirectory = importExternalSalesforceToDirectory;
global.importInternalSalesforceToDirectory = importInternalSalesforceToDirectory;
global.loadSalesforceBrigadeLeaders = loadSalesforceBrigadeLeaders;
global.loadSalesforceData = loadSalesforceData;
global.loadSalesforceDonationData = loadSalesforceDonationData;
global.meetupProSyncMembersAll = meetupProSyncMembersAll;
global.meetupProSyncMembersIncremental = meetupProSyncMembersIncremental;
global.sendEmail = sendEmail;
