/*
* TODO: Rename everything in this file from SalesforceToMeetup -> MeetupToSalesforce
* - Add "Meetup Account ID" as a field on Account in Salesforce (for brigades only)
* - Populate it, and then use it in the import.
*/
const SALESFORCE_STAGING_SHEET_ID = '1bmSgDPBB5buJUBsYvtUND87lHEdOhDAVCq41uFdHzdM';

var SHEET_NAMES = SHEET_NAMES || {};
SHEET_NAMES.salesforceToMeetupOrganizations = '[AUTO] Meetup Organizations';
SHEET_NAMES.salesforceToMeetupAffiliations = '[AUTO] Existing Affiliations from Salesforce';
SHEET_NAMES.salesforceToMeetupContactsToCreate = 'Contacts to Create';
SHEET_NAMES.salesforceToMeetupAffiliationsToUpdate = 'Affiliations to Update';

/*
 * Populates the "Contacts to Create" / "Contacts to Update" / "Affiliations to Create"
 */
const SALESFORCE_TO_MEETUP_CONTACTS_HEADERS = [
  'Meetup_User_ID__c', 'Name', 'npe01__HomeEmail__c', 'MC_Brigade_Newsletter__c', 'Program_Interest_Brigade__c',
];
const SALESFORCE_TO_MEETUP_AFFILIATIONS_TO_UPDATE_HEADERS = [
  'npe5__Contact__r:Meetup_User_ID__c', 'npe5__Organization__c', 'npe5__StartDate__c', 'npe5__EndDate__c', 'Source__c',
];
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
function _salesforceToMeetupLoadRecordsToCreateAndUpdate() {
  const meetupMembers = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers)
    .getDataRange()
    .getValues();

  const meetupMembersHeaders = meetupMembers.shift();
  const contacts = [];
  const affiliations = [];
  for (const i in meetupMembers) {
    const meetupMember = meetupMembers[i];

    // don't import people without an email address
    const meetupMemberEmail = meetupMember[meetupMembersHeaders.indexOf('Email Address')];
    if (!meetupMemberEmail || !meetupMemberEmail.length) {
      continue;
    }

    // don't import people who have never attended an event
    const meetupMemberEvents = parseInt(meetupMember[meetupMembersHeaders.indexOf('Events Attended')]);
    if (meetupMemberEvents === 0) {
      continue;
    }

    // add the person to the contacts array
    contacts.push([
      meetupMember[meetupMembersHeaders.indexOf('Meetup ID')],
      meetupMember[meetupMembersHeaders.indexOf('Full Name')],
      meetupMember[meetupMembersHeaders.indexOf('Email Address')],
      'TRUE',
      'TRUE',
    ]);

    // then, add an affiliation for every brigade
    const meetupMemberBrigades = JSON.parse(meetupMember[meetupMembersHeaders.indexOf('Chapters')]);
    for (const j in meetupMemberBrigades) {
      const brigade = meetupMemberBrigades[j];

      affiliations.push([
        meetupMember[meetupMembersHeaders.indexOf('Meetup ID')],
        `TODO: ${brigade.name}`,
        _convertMeetupTime(meetupMember[meetupMembersHeaders.indexOf('Join Time')]),
        _convertMeetupTime(meetupMember[meetupMembersHeaders.indexOf('Join Time')] + THREE_DAYS_IN_MS),
        'Meetup',
      ]);
    }
  }

  Logger.log(`Dumping ${contacts.length} contacts to sheet`);
  console.log(`Dumping ${contacts.length} contacts to sheet`);
  Logger.log(`Dumping ${affiliations.length} affiliations to sheet`);
  console.log(`Dumping ${affiliations.length} affiliations to sheet`);

  // finally, dump everything to the sheet
  SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.salesforceToMeetupContactsToCreate)
    .clear()
    .getRange(1, 1, 1, SALESFORCE_TO_MEETUP_CONTACTS_HEADERS.length)
    .setValues([SALESFORCE_TO_MEETUP_CONTACTS_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, contacts.length, contacts[0].length)
    .setValues(contacts)
    .getSheet()
    .getParent()
    .getSheetByName(SHEET_NAMES.salesforceToMeetupAffiliationsToUpdate)
    .clear()
    .getRange(1, 1, 1, SALESFORCE_TO_MEETUP_AFFILIATIONS_TO_UPDATE_HEADERS.length)
    .setValues([SALESFORCE_TO_MEETUP_AFFILIATIONS_TO_UPDATE_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, affiliations.length, affiliations[0].length)
    .setValues(affiliations);
}

const SALESFORCE_TO_MEETUP_AFFILIATIONS_HEADERS = [
  'Affiliation Id', 'Contact Id', 'Contact Meetup User Id', 'Organization Id',
];
function _salesforceToMeetupLoadExistingAffiliations() {
  const salesforceResults = salesforceListBrigadeAffiliations();

  const affiliations = [];
  for (const i in salesforceResults) {
    const affiliation = salesforceResults[i];
    affiliations.push([
      affiliation.Id,
      affiliation.npe5__Contact__c,
      affiliation.npe5__Contact__r.Meetup_User_ID__c,
      affiliation.npe5__Organization__c,
    ]);
  }

  SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.salesforceToMeetupAffiliations)
    .clear()
    .getRange(1, 1, 1, SALESFORCE_TO_MEETUP_AFFILIATIONS_HEADERS.length)
    .setValues([SALESFORCE_TO_MEETUP_AFFILIATIONS_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, affiliations.length, affiliations[0].length)
    .setValues(affiliations)
    .getSheet()
    .setFrozenRows(1);
}

function salesforceToMeetupPrepare() {
  _salesforceToMeetupLoadExistingAffiliations();
  _salesforceToMeetupLoadRecordsToCreateAndUpdate();
}

function salesforceToMeetupExecute() {
  // do the bulk data loads
}
