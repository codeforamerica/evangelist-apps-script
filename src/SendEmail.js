const { SHEET_NAMES } = require('./Code.js');
const {
  loadAll,
} = require('./Code.js');
const {
  BrigadeList,
  databaseTestBrigadeURLs,
} = require('./BrigadeDirectory.js');

// eslint-di
function sendEmail() {
  loadAll();

  // test brigade URLs
  const salesforceSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);
  const brigadeList = BrigadeList.fromSalesforceSheet(salesforceSheet.getDataRange().getValues());
  databaseTestBrigadeURLs(brigadeList);

  const contents = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_NAMES.todo)
    .getDataRange()
    .getValues();

  const idxMissingSalesforce = contents[0].indexOf('Missing from Salesforce');
  const idxMissingBrigadeInfo = contents[0].indexOf('Missing from brigade-information');
  const idxMissingPrimaryContact = contents[0].indexOf('Missing Primary Contact');
  const idxAddBrigadeLeads = contents[0].indexOf('Add to brigadeleads@');
  const idxMissingMeetupGroupId = contents[0].indexOf('Missing Meetup Group ID');

  contents.shift(); // remove header row

  let body = '<p>Missing from Salesforce:</p><ul>';
  contents.forEach((row) => {
    if (row[idxMissingSalesforce] && row[idxMissingSalesforce].length) {
      body += `<li>${row[idxMissingSalesforce]}</li>`;
    }
  });
  body += '</ul>';

  body += '<p>Missing from brigade-information repo:</p><ul>';
  contents.forEach((row) => {
    if (row[idxMissingBrigadeInfo] && row[idxMissingBrigadeInfo].length) {
      body += `<li>${row[idxMissingBrigadeInfo]}</li>`;
    }
  });
  body += '</ul>';

  body += '<p>Missing Primary Contact in Salesforce:</p><ul>';
  contents.forEach((row) => {
    if (row[idxMissingPrimaryContact] && row[idxMissingPrimaryContact].length) {
      body += `<li>${row[idxMissingPrimaryContact]}</li>`;
    }
  });
  body += '</ul>';

  body += '<p>Primary Contact needs added to brigadeleads@:</p><ul>';
  contents.forEach((row) => {
    if (row[idxAddBrigadeLeads] && row[idxAddBrigadeLeads].length) {
      body += `<li>${row[idxAddBrigadeLeads]}</li>`;
    }
  });
  body += '</ul>';

  body += '<p>Missing Meetup Group ID in Salesforce:</p><ul>';
  contents.forEach((row) => {
    if (row[idxMissingMeetupGroupId] && row[idxMissingMeetupGroupId].length) {
      body += `<li>${row[idxMissingMeetupGroupId]}</li>`;
    }
  });
  body += '</ul>';
  body += '<p>(Look up Meetup Group IDs at <a href="https://secure.meetup.com/meetup_api/console/?path=/:urlname">https://secure.meetup.com/meetup_api/console/?path=/:urlname</a>)</p>';

  body += `<p>Other Log Output:</p><pre>${Logger.getLog()}</pre>`;

  MailApp.sendEmail({
    to: 'tdooner@codeforamerica.org',
    subject: 'Weekly Network Data Inconsistencies',
    htmlBody: body,
  });
}

module.exports = {
  sendEmail,
};
