function sendEmail() {
  loadAll();
  compareDatabaseAndSalesforce();
  databaseTestBrigadeURLs();

  const contents = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.todo).getDataRange().getValues();
  const idxMissingSalesforce = contents[0].indexOf('Missing from Salesforce');
  const idxMissingBrigadeInfo = contents[0].indexOf('Missing from brigade-information');
  const idxMissingPrimaryContact = contents[0].indexOf('Missing Primary Contact');
  const idxAddBrigadeLeads = contents[0].indexOf('Add to brigadeleads@');
  const idxMissingMeetupUserId = contents[0].indexOf('Missing Meetup User ID');

  contents.shift(); // remove header row

  let body = '<p>Missing from Salesforce:</p><ul>';
  for (var i in contents) {
    if (contents[i][idxMissingSalesforce] && contents[i][idxMissingSalesforce].length) {
      body += `<li>${contents[i][idxMissingSalesforce]}</li>`;
    }
  }
  body += '</ul>';

  body += '<p>Missing from brigade-information repo:</p><ul>';
  for (var i in contents) {
    if (contents[i][idxMissingBrigadeInfo] && contents[i][idxMissingBrigadeInfo].length) {
      body += `<li>${contents[i][idxMissingBrigadeInfo]}</li>`;
    }
  }
  body += '</ul>';

  body += '<p>Missing Primary Contact in Salesforce:</p><ul>';
  for (var i in contents) {
    if (contents[i][idxMissingPrimaryContact] && contents[i][idxMissingPrimaryContact].length) {
      body += `<li>${contents[i][idxMissingPrimaryContact]}</li>`;
    }
  }
  body += '</ul>';

  body += '<p>Primary Contact needs added to brigadeleads@:</p><ul>';
  for (var i in contents) {
    if (contents[i][idxAddBrigadeLeads] && contents[i][idxAddBrigadeLeads].length) {
      body += `<li>${contents[i][idxAddBrigadeLeads]}</li>`;
    }
  }
  body += '</ul>';

  body += '<p>Missing Meetup User ID in Salesforce:</p><ul>';
  for (var i in contents) {
    if (contents[i][idxMissingMeetupUserId] && contents[i][idxMissingMeetupUserId].length) {
      body += `<li>${contents[i][idxMissingMeetupUserId]}</li>`;
    }
  }

  body += `<p>Other Log Output:</p><pre>${Logger.getLog()}</pre>`;

  MailApp.sendEmail({
    to: 'tdooner@codeforamerica.org',
    subject: 'Weekly Network Data Inconsistencies',
    htmlBody: body,
  });
}
