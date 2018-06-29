const {
  createTriggers,
  loadAll,
  loadSalesforceData,
  loadSalesforceDonationData,
  loadSalesforceBrigadeLeaders,
} = require('./Code.js');
const {
  discourseSyncBrigadeList,
} = require('./Discourse.js');
const {
  externalSheetSyncAll,
} = require('./ExternalSheets.js');
const {
  importInternalSalesforceToDirectory,
  importExternalSalesforceToDirectory,
} = require('./BrigadeDatabase.js');
const {
  meetupProSyncMembersIncremental,
  meetupProSyncMembersAll,
} = require('./MeetupProSync.js');
const {
  meetupToSalesforcePrepare,
  meetupToSalesforceExecute,
} = require('./MeetupToSalesforce.js');
const {
  sendEmail,
} = require('./SendEmail.js');
const UpdateFormBrigadeDropdown = require('./UpdateFormBrigadeDropdown');

// register all public methods so they can be called by Google Apps Script
global.createTriggers = createTriggers;
global.discourseSyncBrigadeList = discourseSyncBrigadeList;
global.externalSheetSyncAll = externalSheetSyncAll;
global.importExternalSalesforceToDirectory = importExternalSalesforceToDirectory;
global.importInternalSalesforceToDirectory = importInternalSalesforceToDirectory;
global.loadAll = loadAll;
global.loadSalesforceBrigadeLeaders = loadSalesforceBrigadeLeaders;
global.loadSalesforceData = loadSalesforceData;
global.loadSalesforceDonationData = loadSalesforceDonationData;
global.meetupProSyncMembersAll = meetupProSyncMembersAll;
global.meetupProSyncMembersIncremental = meetupProSyncMembersIncremental;
global.meetupToSalesforcePrepare = meetupToSalesforcePrepare;
global.meetupToSalesforceExecute = meetupToSalesforceExecute;
global.meetupToSalesforceSync = () => {
  meetupToSalesforcePrepare();
  meetupToSalesforceExecute();
};
global.sendEmail = sendEmail;
global.updateFormBrigadeDropdown = function updateFormBrigadeDropdown() {
  [
    // [form id, question title]

    // slack signup form @ slack.codeforamerica.org:
    ['17BXzqiA_cYAfpDSILHDnlavQOXV8kHgsYWp4f8ayUt4', 'If you attend Brigade events, which Brigade do you attend?'],
    // NDoCH 2018 signup form
    ['1BDA2LSngoOMw9qqQL4Pmv4K9qzJPeQzFPy6FxkIiGOc', 'Which Brigade is hosting this event?'],
  ].forEach(([formId, questionTitle]) =>
    new UpdateFormBrigadeDropdown(formId, questionTitle).updateField());
};
