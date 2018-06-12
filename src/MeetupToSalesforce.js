const fullNameSplitter = require('full-name-splitter');

const {
  convertMeetupTime,
  MEETUP_MEMBERSHIP_SPREADSHEET_ID,
} = require('./MeetupProSync.js');
const {
  SHEET_NAMES,
} = require('./Code.js');
const {
  salesforceListBrigadeAffiliations,
} = require('./Salesforce.js');

/*
* TODO:
* - Populate it, and then use it in the import.
*/
const SALESFORCE_STAGING_SHEET_ID = '1bmSgDPBB5buJUBsYvtUND87lHEdOhDAVCq41uFdHzdM';

SHEET_NAMES.meetupToSalesforceOrganizations = '[AUTO] Meetup Organizations';
SHEET_NAMES.meetupToSalesforceAffiliations = '[AUTO] Existing Affiliations from Salesforce';
SHEET_NAMES.meetupToSalesforceContactsToCreate = 'Contacts to Create';
SHEET_NAMES.meetupToSalesforceAffiliationsToUpdate = 'Affiliations to Update';

/*
 * Populates the "Contacts to Create" / "Affiliations to Create"
 */
const MEETUP_TO_SALESFORCE_CONTACTS_HEADERS = [
  'Meetup_User_ID__c', 'FirstName', 'LastName', 'Email', 'MC_Brigade_Newsletter__c', 'Program_Interest_Brigade__c',
];
const MEETUP_TO_SALESFORCE_AFFILIATIONS_TO_UPDATE_HEADERS = [
  'npe5__Contact__r:Meetup_User_ID__c', 'npe5__Organization__c', 'npe5__StartDate__c', 'npe5__EndDate__c', 'Source__c',
];
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
function meetupToSalesforceLoadRecordsToCreateAndUpdate() {
  const meetupMembers = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers)
    .getDataRange()
    .getValues();

  const meetupMembersHeaders = meetupMembers.shift();
  const contacts = [];
  const affiliations = [];
  meetupMembers.each((meetupMember) => {
    // don't import people without an email address
    const meetupMemberEmail = meetupMember[meetupMembersHeaders.indexOf('Email Address')];
    if (!meetupMemberEmail || !meetupMemberEmail.length) {
      return;
    }

    // don't import people who have never attended an event
    const meetupMemberEvents = parseInt(meetupMember[meetupMembersHeaders.indexOf('Events Attended')], 10);
    if (meetupMemberEvents === 0) {
      return;
    }

    // add the person to the contacts array
    const guessedFirstAndLastName = fullNameSplitter(meetupMember[meetupMembersHeaders.indexOf('Full Name')]);
    contacts.push([
      meetupMember[meetupMembersHeaders.indexOf('Meetup ID')],
      guessedFirstAndLastName[0],
      guessedFirstAndLastName[1],
      meetupMember[meetupMembersHeaders.indexOf('Email Address')],
      'TRUE',
      'TRUE',
    ]);

    // then, add an affiliation for every brigade
    const meetupMemberBrigades = JSON.parse(meetupMember[meetupMembersHeaders.indexOf('Chapters')]);
    meetupMemberBrigades.forEach((brigade) => {
      affiliations.push([
        meetupMember[meetupMembersHeaders.indexOf('Meetup ID')],
        `TODO: ${brigade.name}`,
        convertMeetupTime(meetupMember[meetupMembersHeaders.indexOf('Join Time')]),
        convertMeetupTime(meetupMember[meetupMembersHeaders.indexOf('Join Time')] + THREE_DAYS_IN_MS),
        'Meetup',
      ]);
    });
  });

  Logger.log(`Dumping ${contacts.length} contacts to sheet`);
  console.log(`Dumping ${contacts.length} contacts to sheet`);
  Logger.log(`Dumping ${affiliations.length} affiliations to sheet`);
  console.log(`Dumping ${affiliations.length} affiliations to sheet`);

  // finally, dump everything to the sheet
  SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupToSalesforceContactsToCreate)
    .clear()
    .getRange(1, 1, 1, MEETUP_TO_SALESFORCE_CONTACTS_HEADERS.length)
    .setValues([MEETUP_TO_SALESFORCE_CONTACTS_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, contacts.length, contacts[0].length)
    .setValues(contacts)
    .getSheet()
    .getParent()
    .getSheetByName(SHEET_NAMES.meetupToSalesforceAffiliationsToUpdate)
    .clear()
    .getRange(1, 1, 1, MEETUP_TO_SALESFORCE_AFFILIATIONS_TO_UPDATE_HEADERS.length)
    .setValues([MEETUP_TO_SALESFORCE_AFFILIATIONS_TO_UPDATE_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, affiliations.length, affiliations[0].length)
    .setValues(affiliations);
}

const MEETUP_TO_SALESFORCE_AFFILIATIONS_HEADERS = [
  'Affiliation Id', 'Contact Id', 'Contact Meetup User Id', 'Organization Id',
];
function meetupToSalesforceLoadExistingAffiliations() {
  const salesforceResults = salesforceListBrigadeAffiliations();

  const affiliations = salesforceResults.map(affiliation => [
    affiliation.Id,
    affiliation.npe5__Contact__c,
    affiliation.npe5__Contact__r.Meetup_User_ID__c,
    affiliation.npe5__Organization__c,
  ]);

  SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupToSalesforceAffiliations)
    .clear()
    .getRange(1, 1, 1, MEETUP_TO_SALESFORCE_AFFILIATIONS_HEADERS.length)
    .setValues([MEETUP_TO_SALESFORCE_AFFILIATIONS_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, affiliations.length, affiliations[0].length)
    .setValues(affiliations)
    .getSheet()
    .setFrozenRows(1);
}

function meetupToSalesforcePrepare() {
  meetupToSalesforceLoadExistingAffiliations();
  meetupToSalesforceLoadRecordsToCreateAndUpdate();
}

function meetupToSalesforceExecute() {
  // do the bulk data loads
}

module.exports = {
  meetupToSalesforcePrepare,
  meetupToSalesforceExecute,
};
