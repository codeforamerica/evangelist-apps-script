import {
  createTriggers,
  createUI,
  loadAll,
  loadGroupMembers,
  loadSalesforceData,
  loadSalesforceDonationData,
  loadSalesforceBrigadeLeaders,
} from './Code';
import { discourseSyncBrigadeList } from './Discourse';
import { slackChannelsImport } from './slack/SlackOAuth';

const {
  externalSheetSyncAll,
} = require('./ExternalSheets.js');
const {
  importInternalSalesforceToDirectory,
  importExternalSalesforceToDirectory,
} = require('./BrigadeDirectory.js');
const {
  meetupProSyncEvents,
  meetupProSyncMembersAll,
  meetupProSyncMembersIncremental,
} = require('./MeetupProSync');
const {
  meetupToSalesforcePrepare,
  meetupToSalesforceExecute,
  meetupToSalesforceSyncActiveCounts,
} = require('./MeetupToSalesforce');
const {
  sendEmail,
} = require('./SendEmail.js');
const UpdateFormBrigadeDropdown = require('./UpdateFormBrigadeDropdown');

global.onOpen = function onOpen() {
  createUI();
};

// register all public methods so they can be called by Google Apps Script
global.createTriggers = createTriggers;
global.discourseSyncBrigadeList = discourseSyncBrigadeList;
global.externalSheetSyncAll = externalSheetSyncAll;
global.importExternalSalesforceToDirectory = importExternalSalesforceToDirectory;
global.importInternalSalesforceToDirectory = importInternalSalesforceToDirectory;
global.loadAll = loadAll;
global.loadGroupMembers = loadGroupMembers;
global.loadSalesforceBrigadeLeaders = loadSalesforceBrigadeLeaders;
global.loadSalesforceData = loadSalesforceData;
global.loadSalesforceDonationData = loadSalesforceDonationData;
global.meetupProSyncEvents = meetupProSyncEvents;
global.meetupProSyncMembersAll = meetupProSyncMembersAll;
global.meetupProSyncMembersIncremental = meetupProSyncMembersIncremental;
global.meetupToSalesforcePrepare = meetupToSalesforcePrepare;
global.meetupToSalesforceExecute = meetupToSalesforceExecute;
global.meetupToSalesforceSyncActiveCounts = meetupToSalesforceSyncActiveCounts;
global.meetupToSalesforceSync = () => {
  meetupToSalesforcePrepare();
  meetupToSalesforceExecute();
};
global.sendEmail = sendEmail;
global.slackChannelsImport = slackChannelsImport;
global.updateFormBrigadeDropdown = function updateFormBrigadeDropdown() {
  [
    // [form id, question title]

    // slack signup form @ slack.codeforamerica.org:
    ['17BXzqiA_cYAfpDSILHDnlavQOXV8kHgsYWp4f8ayUt4', 'If you attend Brigade events, which Brigade do you attend?'],
    // NDoCH 2018 signup form
    ['1BDA2LSngoOMw9qqQL4Pmv4K9qzJPeQzFPy6FxkIiGOc', 'Which Brigade is hosting this event?'],
    // Summit 2018 comp ticket form
    ['1iw8VK3ZSOL5Ae2m2rh8mMfWnAalHCKOWSiFPiMSWX9U', 'Which Brigade are you a member of?'],
    // record clearance research team form
    ['16BLjhZbshOkjZzGcg41crOxw8OhJuJLryTl-X8sIzlA', 'If you are a member of a Brigade, which one?'],
  ].forEach(([formId, questionTitle]) => new UpdateFormBrigadeDropdown(
    formId, questionTitle,
  ).updateField());
};
