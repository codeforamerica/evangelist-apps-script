// load Object polyfills
require('./Util.js');

const {
  SHEET_NAMES,
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
  sendEmail,
} = require('./SendEmail.js');
const SlackSignupForm = require('./SlackSignupForm');
const UpdateFormBrigadeDropdown = require('./UpdateFormBrigadeDropdown');

const SLACK_SIGNUP_FORM_ID = '17BXzqiA_cYAfpDSILHDnlavQOXV8kHgsYWp4f8ayUt4';

// register all public methods so they can be called by Google Apps Script
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
global.sendEmail = sendEmail;
global.slackSignupForm = function slackSignupForm() {
  const form = new SlackSignupForm(
    SpreadsheetApp.getActive().getId(),
    SHEET_NAMES.salesforce,
    SLACK_SIGNUP_FORM_ID,
  );

  form.updateField();
};
global.updateFormBrigadeDropdown = function updateFormBrigadeDropdown() {
  [
    // form id, question title
    '1BDA2LSngoOMw9qqQL4Pmv4K9qzJPeQzFPy6FxkIiGOc', 'Which Brigade is hosting this event?',
  ].forEach(([formId, questionTitle]) =>
    new UpdateFormBrigadeDropdown(formId, questionTitle).update());
};
