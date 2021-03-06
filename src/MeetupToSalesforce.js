const { convertMeetupTime } = require('./meetup/MeetupUtil');
const {
  salesforceListBrigadeAffiliations,
  salesforceListBrigades,
} = require('./Salesforce');
const SalesforceClient = require('./salesforce/SalesforceClient');

const fullNameSplitter = require('full-name-splitter').default;

const {
  MEETUP_MEMBERSHIP_SPREADSHEET_ID,
} = require('./MeetupProSync.js');
const {
  SHEET_NAMES,
} = require('./Code');
const { rowsToCSV } = require('./Util');

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

function loadExistingAffiliations() {
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
}

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
    const salesforceId = row[salesforceHeaders.indexOf('Salesforce Account ID')];
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
 */
const MEETUP_TO_SALESFORCE_CONTACTS_HEADERS = [
  'Meetup_User_ID__c', 'FirstName', 'LastName', 'Email', 'Data_Source__c', 'Team_Ownership__c', 'MailingCity', 'MailingState', 'Industry__c',
];
const MEETUP_TO_SALESFORCE_CONTACTS_UPSERT_HEADERS = [
  'Email', 'Meetup_User_ID__c', 'Meetup_Last_Access_Date__c', 'Brigade_Interest__c',
];
const MEETUP_TO_SALESFORCE_AFFILIATIONS_TO_UPDATE_HEADERS = [
  'Id', 'npe5__Contact__r.Meetup_User_ID__c', 'npe5__Organization__c', 'npe5__StartDate__c', 'npe5__EndDate__c', 'Source__c',
];
const THREE_MONTHS_IN_MS = 3 * 30 * 24 * 60 * 60 * 1000;
function meetupToSalesforceLoadRecordsToCreateAndUpdate() {
  const meetupMembers = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers)
    .getDataRange()
    .getValues();

  const existingAffiliations = loadExistingAffiliations();
  const meetupMembersHeaders = meetupMembers.shift();
  const contactsToAdd = [];
  const contactsToUpsert = [];
  const affiliations = [];

  meetupMembers
    // only sync members with email addresses
    .filter(member => member[meetupMembersHeaders.indexOf('Email Address')])
    .forEach((member) => {
      const guessedFirstAndLastName = fullNameSplitter(member[meetupMembersHeaders.indexOf('Full Name')]);

      // only sync members with a last name
      // (to comply with salesforce last name requirement)
      if (!guessedFirstAndLastName[1]) {
        return;
      }

      contactsToAdd.push([
        member[meetupMembersHeaders.indexOf('Meetup ID')], // Meetup_User_ID__c
        guessedFirstAndLastName[0], // FirstName
        guessedFirstAndLastName[1], // LastName
        member[meetupMembersHeaders.indexOf('Email Address')], // Email
        'Meetup', // Data_Source__c
        'Brigade Network', // Team_Ownership__c
        member[meetupMembersHeaders.indexOf('City')], // MailingCity
        member[meetupMembersHeaders.indexOf('State')], // MailingState
        'CivicTech', // Industry__c
      ]);

      contactsToUpsert.push([
        member[meetupMembersHeaders.indexOf('Email Address')],
        member[meetupMembersHeaders.indexOf('Meetup ID')],
        convertMeetupTime(member[meetupMembersHeaders.indexOf('Last Access Time')]),
        'TRUE',
      ]);

      const meetupMemberBrigades = JSON.parse(member[meetupMembersHeaders.indexOf('Chapters')]);
      meetupMemberBrigades.forEach((brigade) => {
        const orgSalesforceId = BRIGADES_BY_MEETUP_ID[brigade.id];

        // skip orgs without "Meetup Group IDs" in Salesforce
        if (!orgSalesforceId) {
          return;
        }

        const affiliationKey = [
          member[meetupMembersHeaders.indexOf('Meetup ID')],
          orgSalesforceId,
        ];

        affiliations.push([
          existingAffiliations[affiliationKey] || '',
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
  console.log('Beginning Meetup -> Salesforce sync');

  let csv;
  let response;
  const salesforce = new SalesforceClient();

  // 1. bulk create contacts
  const contactsToCreate =
    SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
      .getSheetByName(SHEET_NAMES.meetupToSalesforceContactsToCreate)
      .getDataRange()
      .getValues();

  csv = rowsToCSV(contactsToCreate);
  response = salesforce.salesforceBulkRequest(
    'Contact',
    csv,
    'insert',
  );
  if (response.error) {
    throw new Error(`Error creating contacts: ${response.error}`);
  } else if (!response.success) {
    throw new Error(`Job failed creating contacts: ${response.errorMessage}`);
  }

  // 2. bulk upsert contacts
  const contactsToUpsert =
    SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
      .getSheetByName(SHEET_NAMES.meetupToSalesforceContactsToUpsert)
      .getDataRange()
      .getValues();

  csv = rowsToCSV(contactsToUpsert);
  response = salesforce.salesforceBulkRequest(
    'Contact',
    csv,
    'upsert',
    'Email',
  );
  if (response.error) {
    throw new Error(`Error upserting contacts: ${response.error}`);
  } else if (!response.success) {
    throw new Error(`Job failed upserting contacts: ${response.errorMessage}`);
  }

  // 3. bulk upsert affiliations
  const affiliationsToUpsert =
    SpreadsheetApp.openById(SALESFORCE_STAGING_SHEET_ID)
      .getSheetByName(SHEET_NAMES.meetupToSalesforceAffiliationsToUpdate)
      .getDataRange()
      .getValues();

  csv = rowsToCSV(affiliationsToUpsert);
  response = salesforce.salesforceBulkRequest(
    'npe5__Affiliation__c',
    csv,
    'upsert',
    'Id',
  );
  if (response.error) {
    throw new Error(`Error upserting affiliations: ${response.error}`);
  } else if (!response.success) {
    throw new Error(`Job failed upserting affiliations: ${response.errorMessage}`);
  }

  console.log('Finished Meetup -> Salesforce sync');
}

const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;
function meetupToSalesforceSyncActiveCounts() {
  console.log('Beginning sync of Meetup 1-yr active counts');

  const salesforce = new SalesforceClient();

  const meetupMembers = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers)
    .getDataRange()
    .getValues();
  const meetupMembersHeaders = meetupMembers.shift();

  const attendanceByMeetupId = {};
  console.log(`Found ${meetupMembers.length} members total`);

  meetupMembers.forEach((member) => {
    // filter out members who haven't been to meetup lately
    const lastAccessTime = member[meetupMembersHeaders.indexOf('Last Access Time')];
    if (new Date() - lastAccessTime >= ONE_YEAR_IN_MS) {
      return;
    }

    const meetupMemberBrigades = JSON.parse(member[meetupMembersHeaders.indexOf('Chapters')]);
    meetupMemberBrigades.forEach((brigade) => {
      attendanceByMeetupId[brigade.id] = attendanceByMeetupId[brigade.id] || 0;
      attendanceByMeetupId[brigade.id] += 1;
    });
  });

  const brigadesToUpdate = [['Id', 'Meetup_1_yr_active_member_count__c']];
  const brigades = salesforceListBrigades();
  brigades.forEach((brigade) => {
    if (!brigade.MeetUp_Group_ID__c || !attendanceByMeetupId[brigade.MeetUp_Group_ID__c]) {
      return;
    }

    brigadesToUpdate.push([
      brigade.Id,
      attendanceByMeetupId[brigade.MeetUp_Group_ID__c],
    ]);
  });

  const response = salesforce.salesforceBulkRequest('Account', rowsToCSV(brigadesToUpdate), 'update');
  if (response.error || response.errorMessage) {
    throw new Error(`Error syncing Meetup 1-yr active counts: ${response.error || response.errorMessage}`);
  }

  console.log('Finished sync of Meetup 1-yr active counts');
}

module.exports = {
  meetupToSalesforcePrepare,
  meetupToSalesforceExecute,
  meetupToSalesforceSyncActiveCounts,
};
