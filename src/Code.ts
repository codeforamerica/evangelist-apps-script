import { Brigade, BrigadeList } from './Brigade';
import {
  salesforceListBrigadeLeaders,
  salesforceListBrigades,
  salesforceListDonations,
} from './Salesforce';

export const SHEET_NAMES = {
  todo: 'TODO List',
  brigadeInfo: 'AUTO:brigade-information',
  meetupEvents: 'AUTO:meetup-events',
  meetupMembers: 'AUTO:meetup-members',
  salesforce: 'AUTO:salesforce',
  salesforceDonations: 'AUTO:salesforce-donations',
  salesforceBrigadeLeaders: 'AUTO:salesforce-brigade-leaders',
  brigadeleads: 'AUTO:brigadeleads',
};

const BRIGADE_INFO_HEADERS: Array<[string, (b: Brigade) => (string)]> = [
  ['Brigade Name', b => b.name],
]
function loadBrigadeInformation() {
  const infoResponse = UrlFetchApp.fetch('https://raw.githubusercontent.com/codeforamerica/brigade-information/master/organizations.json');
  const info = JSON.parse(infoResponse.getContentText());
  const brigades = BrigadeList.fromBrigadeInformationJSON(info).brigades;

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEET_NAMES.brigadeInfo);
  sheet.clear();
  const range = sheet.getRange(1, 1, brigades.length, BRIGADE_INFO_HEADERS.length);
  range.setValues(brigades.map(b => BRIGADE_INFO_HEADERS.map(([_, fn]) => fn(b))));
}

/*
 * To set up Salesforce sync, take the following steps:
 * 1. Sign up for a Developer Edition account
 * 2. Create a "Connected App" with the Callback URL set to
 *
 *    https://script.google.com/macros/d/{script_id}/usercallback
 *
 *    where {script_id} is found in File > Project properties
 * 3. Copy the App's Consumer Key and Consumer Secret into "Script Properties"
 *    in the "File > Project properties" dialog
 * 4. Run the "salesforceAuthorize" function in the "Salesforce.gs" script
 *    and click the "Authorize" link that appears in the spreadsheet.
 */
const SALESFORCE_HEADERS: Array<[string, (b: SalesforceBrigade) => (string | boolean | null)]> = [
  ['Brigade Name', b => b.Name],
  ['Salesforce Account ID', b => b.Id],
  ['Active?', b => b.RecordTypeId === '012d0000001YapjAAC' && b.Brigade_Status__c === 'Signed MOU'],
  ['Website', b => b.Website || b.Site_Link__c],
  ['Meetup URL', b => b.MeetUp_Link__c],
  ['Meetup User ID', b => b.MeetUp_Group_ID__c],
  ['Location', b => b.Brigade_Location__c],
  ['Region', b => b.Brigade_Region__c],
  ['Twitter', b => b.Organization_Twitter__c],
  ['GitHub URL', b => b.Github_URL__c],
  ['Facebook Page URL', b => b.Facebook_Page_URL__c],
  ['Primary Contact', b => b.npe01__One2OneContact__r && b.npe01__One2OneContact__r.Name],
  ['Primary Contact Email', b => b.npe01__One2OneContact__r && b.npe01__One2OneContact__r.Email],
  ['Public Contact Email', b => b.Brigade_Public_Email__c],
];

function loadSalesforceData() {
  const salesforceBrigades = salesforceListBrigades();
  const brigades =
    salesforceBrigades.map(brigade => SALESFORCE_HEADERS.map(([_, fn]) => fn(brigade)));

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);

  // sanity check, if there is no data let's bail and leave the sheet unchanged
  //   (this happens for example when we hit salesforce API limit)
  if (!brigades.length) {
    Logger.log('ERROR: No brigades returned from salesforce. Bailing.');
    const existingBrigades =
      sheet.getRange(2, 1, sheet.getLastRow(), SALESFORCE_HEADERS.length).getValues();
    return existingBrigades;
  }

  sheet
    .clear()
    .getRange(1, 1, 1, SALESFORCE_HEADERS.length)
    .setFontWeight('bold')
    .setValues([SALESFORCE_HEADERS.map(([name, _]) => name)])
    .getSheet()
    .getRange(2, 1, brigades.length, SALESFORCE_HEADERS.length)
    .setValues(brigades);

  sheet.setFrozenRows(1);
  return brigades;
}

const SALESFORCE_DONATION_HEADERS = [
  'Date', 'Name', 'Email', 'Amount', 'Description', 'Brigade Designation',
];
const SALESFORCE_DONATION_INCLUDE_BOTH_CONTACT_AND_ACCOUNT_TYPE_WHITELIST = [
  'Corporation', 'Government', 'Foundation', // types of Account in salesforce
];
function loadSalesforceDonationData() {
  const salesforceDonations = salesforceListDonations();
  const donations: Array<Array<string>> = [];

  salesforceDonations.forEach((donation) => {
    /*
     * Pull the contact and account names for the donation. If the Account Name
     * is like "Tom Dooner Household" then we'll just show the donation as from
     * "Tom Dooner" but if the Account Name is something else, it's likely a
     * corporate donation and we should show it as "SomeCorp (Tom Dooner)"
     */
    const donationContactName = donation.Account.npe01__One2OneContact__r ? donation.Account.npe01__One2OneContact__r.Name : '';
    const donationAccountName = donation.Account.Name;
    let donationName;

    // eslint-disable-next-line
    if (SALESFORCE_DONATION_INCLUDE_BOTH_CONTACT_AND_ACCOUNT_TYPE_WHITELIST.indexOf(donation.Account.Type) !== -1) {
      if (donationContactName.length) {
        // corporate donation with an attached contact (i.e. through the donate form)
        donationName = `${donationAccountName} (${donationContactName})`;
      } else {
        // corporate donation without a contact (i.e. by wire or check)
        donationName = donationAccountName;
      }
    } else if (donationContactName.length) {
      // individual donation with an attached contact (i.e. most donations since 2016)
      donationName = donationContactName;
    } else {
      // old individual donations (pre-2016) - fall back on account name
      donationName = donationAccountName;
    }

    donations.push([
      donation.CloseDate,
      // name: (use contact name if possible, fall back on account name otherwise)
      donationName,
      // email: (use contact email if possible, can't fall back because Accounts don't have email)
      donation.Account.npe01__One2OneContact__r ? donation.Account.npe01__One2OneContact__r.Email : '',
      donation.Amount,
      donation.Description,
      donation.Brigade_Designation_lookup__r.Name,
    ]);
  });

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforceDonations);

  // sanity check, if there is no data let's bail and leave the sheet unchanged
  //   (this happens for example when we hit salesforce API limit)
  if (!donations.length) {
    Logger.log('ERROR: No donations returned from salesforce. Bailing.');
    const existingDonations =
      sheet.getRange(2, 1, sheet.getLastRow(), SALESFORCE_DONATION_HEADERS.length).getValues();
    return existingDonations;
  }

  sheet
    .clear()
    .getRange(1, 1, 1, SALESFORCE_DONATION_HEADERS.length)
    .setFontWeight('bold')
    .setValues([SALESFORCE_DONATION_HEADERS])
    .getSheet()
    .getRange(2, 1, donations.length, SALESFORCE_DONATION_HEADERS.length)
    .setValues(donations);

  sheet.setFrozenRows(1);
  return donations;
}

/*
 * Pull a list of any Contact in salesforce that's associated with a Brigade
 * with the "Captain/Co-Captain" flag set. We set this based on who attends the
 * brigade onboarding meeting (among other signs that someone is a brigade leader).
 *
 * This is essentially copied from the other salesforce data fetching methods.
 */
const SALESFORCE_BRIGADE_LEADERS_HEADERS = [
  'Name', 'Email', 'Brigade Name', 'Affiliation Creation Date',
];
function loadSalesforceBrigadeLeaders() {
  const salesforceLeaders = salesforceListBrigadeLeaders();
  const leaders = salesforceLeaders.map(leader => [
    leader.npe5__Contact__r.Name,
    leader.npe5__Contact__r.Email,
    leader.npe5__Organization__r.Name,
    leader.CreatedDate,
  ]);

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforceBrigadeLeaders);

  // sanity check, if there is no data let's bail and leave the sheet unchanged
  //   (this happens for example when we hit salesforce API limit)
  if (!leaders.length) {
    Logger.log('ERROR: No brigade leaders returned from salesforce. Bailing.');
    return null;
  }

  sheet
    .clear()
    .getRange(1, 1, 1, SALESFORCE_BRIGADE_LEADERS_HEADERS.length)
    .setFontWeight('bold')
    .setValues([SALESFORCE_BRIGADE_LEADERS_HEADERS])
    .getSheet()
    .getRange(2, 1, leaders.length, SALESFORCE_BRIGADE_LEADERS_HEADERS.length)
    .setValues(leaders);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumn(SALESFORCE_BRIGADE_LEADERS_HEADERS.indexOf('Name') + 1);
  sheet.autoResizeColumn(SALESFORCE_BRIGADE_LEADERS_HEADERS.indexOf('Email') + 1);
  sheet.getRange(1, SALESFORCE_BRIGADE_LEADERS_HEADERS.indexOf('Affiliation Creation Date') + 1, sheet.getLastRow(), 1)
    .setNumberFormat('m/d/yyyy');

  return leaders;
}

/*
Note: the GroupsApp service does not expose an API for checking the list of
all subscribed addresses, only the subscribed addresses _with a Google Account_.
It appears that the `hasUser` method returns true/false regardless of whether the
address is associated with a Google Account, though, so we can just iterate
through that list.

Also, for some reason, "captains@codefortulsa.org" returns an error message
that the "email is invalid".
*/
const MANUAL_OVERRIDE_ASSUME_MEMBER = [
  'captains@codefortulsa.org',
];
const MANUAL_OVERRIDE_UNSUBSCRIBE = [ // emails of people who have unsubscribed
  'terri@li4e.org',
  'terri@willinghamllc.com',
  'courtney.brousseau@gmail.com',
];
function loadGroupMembers() {
  const { brigades } =
    BrigadeList.fromSalesforceSheet(SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce).getDataRange().getValues());
  const group = GroupsApp.getGroupByEmail('brigadeleads@codeforamerica.org');

  // First, populate a list of emails to check: both Primary & Public contact
  const emails: string[] = [];
  brigades
    .filter(b => b.isActive) // remove missing primary contact & inactive
    .forEach(b => b.primaryContactEmail && emails.push(b.primaryContactEmail));

  brigades
    .filter(b => b.isActive)
    .filter(b => b.publicContactEmail)
    .forEach(b => b.publicContactEmail && emails.push(b.publicContactEmail));

  // ... add in any emails for co-captains that aren't the primary contact:
  const [
    salesforceBrigadeLeadersHeaders,
    ...salesforceBrigadeLeaders
  ] = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforceBrigadeLeaders)
    .getDataRange().getValues();

  salesforceBrigadeLeaders.forEach((brigadeLeader) => {
    const brigadeLeaderEmail = brigadeLeader[salesforceBrigadeLeadersHeaders.indexOf('Email')] as string | null;

    if (brigadeLeaderEmail && brigadeLeaderEmail.length &&
      emails.indexOf(brigadeLeaderEmail) === -1) {
      emails.push(brigadeLeaderEmail);
    }
  });

  // Now, loop over the emails and check each one to see if it's subscribed
  const usersToAppend: string[][] = [];
  emails.forEach((email) => {
    let groupHasUser;

    if (MANUAL_OVERRIDE_ASSUME_MEMBER.indexOf(email) === -1) {
      try {
        groupHasUser = group.hasUser(email);
      } catch (e) {
        Logger.log(`ERROR: Could not check group membership for ${email}: ${e.message}`);
        Logger.log('  ...assuming that email is a member of the group.');
        groupHasUser = true;
      }
    } else {
      groupHasUser = true;
    }

    if (MANUAL_OVERRIDE_UNSUBSCRIBE.indexOf(email) !== -1) {
      groupHasUser = true; // show the user as subscribed, although they have unsubscribed
    }

    usersToAppend.push([
      email,
      groupHasUser,
    ]);
    Utilities.sleep(250);
  });

  const SHEET_HEADERS = ['Primary Contact Email', 'Is Subscribed To brigadeleads@'];
  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEET_NAMES.brigadeleads);

  sheet
    .clear()
    .getRange(1, 1, 1, SHEET_HEADERS.length)
    .setFontWeight('bold')
    .setValues([SHEET_HEADERS])
    .getSheet()
    .getRange(2, 1, usersToAppend.length, usersToAppend[0].length)
    .setValues(usersToAppend);

  sheet.setFrozenRows(1);
}

function createUI() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Update Data')
      .addItem('Update All', 'loadAll')
      .addSeparator()
      .addItem('Auth Salesforce', 'salesforceAuthorize')
      .addItem('Update Salesforce Data', 'loadSalesforceData')
      .addItem('Update brigade-information', 'loadBrigadeInformation')
      .addItem('Update Meetup Data', 'meetupProSyncEvents')
      .addItem('Update brigadeleads@', 'loadGroupMembers')
      .addSeparator()
      .addItem('Send Email Update', 'sendEmail')
      .addItem('Pull Contact Database from Salesforce', 'importSalesforceToDirectory')
      .addToUi();
  } catch (e) {
    // swallow it
  }
}

function createTriggers() {
  // remove all existing triggers:
  const existingTriggers = ScriptApp.getProjectTriggers();
  existingTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // create new triggers:
  ScriptApp.newTrigger('importExternalSalesforceToDirectory')
    .timeBased().everyHours(1).create(); // hourly
  ScriptApp.newTrigger('importInternalSalesforceToDirectory')
    .timeBased().everyHours(1).create(); // hourly
  ScriptApp.newTrigger('meetupProSyncMembersIncremental')
    .timeBased().everyHours(1).create(); // hourly
  ScriptApp.newTrigger('loadSalesforceData')
    .timeBased().everyHours(1).create(); // hourly
  ScriptApp.newTrigger('updateFormBrigadeDropdown')
    .timeBased().everyHours(1).create(); // hourly

  // brigade dashboards / load data for external sheet:
  ScriptApp.newTrigger('loadSalesforceDonationData')
    .timeBased().everyDays(1).atHour(19)
    .create(); // 7pm
  ScriptApp.newTrigger('loadSalesforceBrigadeLeaders')
    .timeBased().everyDays(1).atHour(19)
    .create(); // 7pm
  ScriptApp.newTrigger('meetupProSyncMembersAll')
    .timeBased().everyDays(1).atHour(19)
    .create(); // 7pm

  // propagate data to brigade dashboards
  ScriptApp.newTrigger('externalSheetSyncAll')
    .timeBased().everyDays(1).atHour(20)
    .create(); // 8pm

  // sync users from meetup -> salesforce
  ScriptApp.newTrigger('meetupToSalesforceSync')
    .timeBased().everyDays(1).atHour(23)
    .create(); // 11pm
  // sync "1-yr active member count"
  ScriptApp.newTrigger('meetupToSalesforceSyncActiveCounts')
    .timeBased().everyDays(1).atHour(23)
    .create(); // 11pm

  // sync past/upcoming events for all our brigades
  ScriptApp.newTrigger('meetupProSyncEvents')
    .timeBased().everyDays(1).atHour(0)
    .create(); // 12am

  // send the overview email
  ScriptApp.newTrigger('sendEmail')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7)
    .create(); // 7am Monday
}

function loadAll() {
  loadBrigadeInformation();
  loadSalesforceData();
  loadGroupMembers();
}

module.exports = {
  createUI,
  createTriggers,
  loadAll,
  loadGroupMembers,
  loadSalesforceData,
  loadSalesforceDonationData,
  loadSalesforceBrigadeLeaders,
};
