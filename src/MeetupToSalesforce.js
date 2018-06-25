// TODO: figure out why "default" is required here
const fullNameSplitter = require('full-name-splitter').default;

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
 * The staging sheet is meant to give a bit of visibility into the process and
 * also allow for CSV export.
 */
const SALESFORCE_STAGING_SHEET_ID = '1bmSgDPBB5buJUBsYvtUND87lHEdOhDAVCq41uFdHzdM';

SHEET_NAMES.meetupToSalesforceOrganizations = '[AUTO] Meetup Organizations';
SHEET_NAMES.meetupToSalesforceAffiliations = '[AUTO] Existing Affiliations from Salesforce';
SHEET_NAMES.meetupToSalesforceContactsToCreate = '1. Contacts to Create';
SHEET_NAMES.meetupToSalesforceContactsToUpsert = '2. Contacts to Upsert';
SHEET_NAMES.meetupToSalesforceAffiliationsToUpdate = '3. Affiliations to Upsert';

const TMP_MEETUP_USER_ID_FILTER = id => parseInt(id, 10) === 104952772;

const EXISTING_AFFILIATIONS = (function loadExistingAffiliations() {
  const [
    affiliationHeaders,
    ...affiliations
  ] = SpreadsheetApp
    .openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupToSalesforceAffiliations)
    .getDataRange()
    .getValues();

  return affiliations.reduce((a, row) => {
    a[[ // eslint-disable-line
      row[affiliationHeaders.indexOf('Contact Meetup User Id')],
      row[affiliationHeaders.indexOf('Organization Id')],
    ]] = row[affiliationHeaders.indexOf('Affiliation Id')];

    return a;
  }, {});
}());

const BRIGADES_BY_MEETUP_ID = (function loadBrigadesByMeetupId() {
  const [
    salesforceHeaders,
    ...salesforceData
  ] = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_NAMES.salesforce)
    .getDataRange()
    .getValues();

  return salesforceData.reduce((a, row) => {
    const salesforceId = row[salesforceHeaders.indexOf('Salesforce ID')];
    const meetupUserId = row[salesforceHeaders.indexOf('Meetup User ID')];
    if (!meetupUserId) {
      return a;
    }

    a[meetupUserId] = salesforceId; // eslint-disable-line

    return a;
  });
}());

/*
 * Populates the "Contacts to Create" / "Affiliations to Create"
 *
 * TODO:
 *   Load brigade name -> salesforce ID map
 *   Wire it up on the Affiliations to Upsert page
 *   Actually make sure that any loaded Affiliations to upsert have the existing ID
 *   Rename SALESFORCE_STAGING_SHEET_ID
 *
 */
const MEETUP_TO_SALESFORCE_CONTACTS_HEADERS = [
  'Meetup_User_ID__c', 'FirstName', 'LastName', 'Email', 'MC_Brigade_Newsletter__c', 'Program_Interest_Brigade__c',
];
const MEETUP_TO_SALESFORCE_CONTACTS_UPSERT_HEADERS = [
  'Email', 'Meetup_User_ID__c', 'MC_Brigade_Newsletter__c', 'Program_Interest_Brigade__c',
];
const MEETUP_TO_SALESFORCE_AFFILIATIONS_TO_UPDATE_HEADERS = [
  'Id', 'npe5__Contact__r:Meetup_User_ID__c', 'npe5__Organization__c', 'npe5__StartDate__c', 'npe5__EndDate__c', 'Source__c',
];
const THREE_MONTHS_IN_MS = 3 * 30 * 24 * 60 * 60 * 1000;
function meetupToSalesforceLoadRecordsToCreateAndUpdate() {
  const meetupMembers = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers)
    .getDataRange()
    .getValues();

  const meetupMembersHeaders = meetupMembers.shift();
  const contactsToAdd = [];
  const contactsToUpsert = [];
  const affiliations = [];

  meetupMembers
    // only sync members with email addresses
    .filter(member => member[meetupMembersHeaders.indexOf('Email Address')])
    // temporarily filter out almost everyone for testing
    .filter(member => TMP_MEETUP_USER_ID_FILTER(member[meetupMembersHeaders.indexOf('Meetup ID')]))
    .forEach((member) => {
      const guessedFirstAndLastName = fullNameSplitter(member[meetupMembersHeaders.indexOf('Full Name')]);

      contactsToAdd.push([
        member[meetupMembersHeaders.indexOf('Meetup ID')],
        guessedFirstAndLastName[0],
        guessedFirstAndLastName[1],
        member[meetupMembersHeaders.indexOf('Email Address')],
        'TRUE',
        'TRUE',
      ]);

      contactsToUpsert.push([
        member[meetupMembersHeaders.indexOf('Email Address')],
        member[meetupMembersHeaders.indexOf('Meetup ID')],
        'TRUE',
        'TRUE',
      ]);

      const meetupMemberBrigades = JSON.parse(member[meetupMembersHeaders.indexOf('Chapters')]);
      meetupMemberBrigades.forEach((brigade) => {
        const orgSalesforceId = BRIGADES_BY_MEETUP_ID[brigade.id];
        const affiliationKey = [
          member[meetupMembersHeaders.indexOf('Meetup ID')],
          orgSalesforceId,
        ];

        affiliations.push([
          EXISTING_AFFILIATIONS[affiliationKey] || '',
          member[meetupMembersHeaders.indexOf('Meetup ID')],
          orgSalesforceId,
          convertMeetupTime(member[meetupMembersHeaders.indexOf('Join Time')]),
          convertMeetupTime(member[meetupMembersHeaders.indexOf('Last Access Time')] + THREE_MONTHS_IN_MS),
          'Meetup',
        ]);
      });
    });

  console.log(`Dumping ${contactsToAdd.length} contacts to add`);
  console.log(`Dumping ${affiliations.length} affiliations to sheet`);

  // finally, dump everything to the sheet
  SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupToSalesforceContactsToCreate)
    .clear()
    .getRange(1, 1, 1, MEETUP_TO_SALESFORCE_CONTACTS_HEADERS.length)
    .setValues([MEETUP_TO_SALESFORCE_CONTACTS_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, contactsToAdd.length, contactsToAdd[0].length)
    .setValues(contactsToAdd)
    .getSheet()
    .getParent()
    .getSheetByName(SHEET_NAMES.meetupToSalesforceContactsToUpsert)
    .clear()
    .getRange(1, 1, 1, MEETUP_TO_SALESFORCE_CONTACTS_UPSERT_HEADERS.length)
    .setValues([MEETUP_TO_SALESFORCE_CONTACTS_UPSERT_HEADERS])
    .setFontWeight('bold')
    .getSheet()
    .getRange(2, 1, contactsToUpsert.length, contactsToUpsert[0].length)
    .setValues(contactsToUpsert)
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
