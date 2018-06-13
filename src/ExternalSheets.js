const { SHEET_NAMES } = require('./Code.js');
const {
  convertMeetupTime,
  MEETUP_MEMBERSHIP_SPREADSHEET_ID,
} = require('./MeetupProSync.js');

/*
 * Code related to syndicating the results into Brigade-specific external sheets.
 *
 * TODO: Use Meetup IDs here instead of urlnames.
 */
const EXTERNAL_SHEETS = [
  { sheetId: '134_69wuLsB6kdOA3HctirpHRwwzxtSKun4xmyJqnFXM', name: 'Open Oakland', meetupUrlname: 'OpenOakland' },
  { sheetId: '1Jx39wrbME94f30K8cADoBUCvQvWPtWssZpV978skb_s', name: 'Code for Philly', meetupUrlname: 'Code-for-Philly' },
  { sheetId: '1UWcu6s1uNAJSYfj5NEdd7AKSQkTukVqwkLPRoiNs50Q', name: 'Open Uptown', meetupUrlname: 'openuptown' },
  { sheetId: '1HQpWftpSvL2I7qwuO1q8fwkyo90L-sEH-_6eR9aPM4A', name: 'Code for Orlando', meetupUrlname: 'Code-For-Orlando' },
  { sheetId: '1T4ZGlAgbTMMR9wf6u7DHs4uhhk7-ldiuanmgiZByhhQ', name: 'Open Toledo', meetupUrlname: 'Open-Toledo' },
  { sheetId: '1KPF0iuwLVHiO-mj6Xj3hRpUVbp8cY5cMopdfnaElyXQ', name: 'Code for Baltimore', meetupUrlname: 'Code-for-Baltimore' },
  { sheetId: '1zxyOEOTbkQuJxQSk3h3qAZgakN5XZyNGZT-3QPkzo9k', name: 'Code for Jersey City', meetupUrlname: 'Code-For-Jersey-City' },
  { sheetId: '1mlWT-IHgRYMBq7TsO-g34VIfj7hZ60_2DyZQvZO0Shk', name: 'Civic Data Alliance', meetupUrlname: 'Louisville-Civic-Data-Alliance' },
  { sheetId: '1e7SDp6kF8w8x08qJ6Evel_5WU-5ZSnUrxf3jtjzCVP4', name: 'Open Raleigh Brigade', meetupUrlname: 'Triangle-Code-for-America' },
];

/*
 * Open an external spreadsheet and return an existing sheet by name
 *   or create it if it doesn't exist.
 */
function findOrCreateExternalSheet(id, name) {
  const doc = SpreadsheetApp.openById(id);
  let externalSheet = doc.getSheetByName(name);
  if (!externalSheet) {
    externalSheet = doc.insertSheet(name);
  }

  return externalSheet;
}

function verifyExternalSheets() {
  EXTERNAL_SHEETS.forEach((brigade) => {
    if (!brigade.sheetId) {
      throw new Error(`EXTERNAL_SHEETS item missing 'sheetId': ${JSON.stringify(brigade)}`);
    }
    if (!brigade.name) {
      throw new Error(`EXTERNAL_SHEETS item missing 'name': ${JSON.stringify(brigade)}`);
    }
    if (!brigade.meetupUrlname) {
      throw new Error(`EXTERNAL_SHEETS item missing 'meetupUrlname': ${JSON.stringify(brigade)}`);
    }
  });
}

function externalSheetAddInstructions() {
  EXTERNAL_SHEETS.forEach((brigade) => {
    const externalSheet = findOrCreateExternalSheet(brigade.sheetId, '[AUTO] Instructions');

    const INSTRUCTIONS = [
      ['Notes:'],
      ['- Welcome to your "Brigade Dashboard". This is an attempt to share data that could be useful to your day-to-day running of your brigade.'],
      ['- This is a pilot, send feedback to tdooner@codeforamerica.org'],
      ['- What other info would be helpful to have in here?'],
      [`- Feel free to share with brigade leadership at ${brigade.name}`],
      ['- This spreadsheet updates once a day around 8pm Pacific'],
      ["- Don't rename or modify the \"[AUTO]\" tabs (other than that, you can do whatever)"],
    ];

    externalSheet.clear();
    externalSheet.getRange(1, 1, INSTRUCTIONS.length, INSTRUCTIONS[0].length)
      .setValues(INSTRUCTIONS);
  });
}

function externalSheetSyncMeetup() {
  const sheet = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers);

  const [
    memberHeaders,
    ...members
  ] = sheet.getDataRange().getValues();

  EXTERNAL_SHEETS.forEach((brigade) => {
    Logger.log(`Syncing membership for ${brigade.name}`);
    const externalSheet = findOrCreateExternalSheet(brigade.sheetId, '[AUTO] Members');

    const brigadeMembers = [];

    members.forEach((member) => {
      const memberChapters = JSON.parse(member[memberHeaders.indexOf('Chapters')]);
      memberChapters.forEach((chapter) => {
        if (chapter.urlname === brigade.meetupUrlname) {
          brigadeMembers.push([
            member[memberHeaders.indexOf('Meetup ID')],
            member[memberHeaders.indexOf('Full Name')],
            member[memberHeaders.indexOf('Email Address')],
            member[memberHeaders.indexOf('Events Attended')],
            convertMeetupTime(member[memberHeaders.indexOf('Join Time')]),
            convertMeetupTime(member[memberHeaders.indexOf('Last Access Time')]),
          ]);
        }
      });
    });

    Logger.log(`  found ${brigadeMembers.length} members`);

    const headers = ['Meetup ID', 'Name', 'Email', 'Events Attended', 'Join Time', 'Last Access Time', '', `Last Updated: ${(new Date()).toDateString()}`];
    externalSheet.clearContents();
    externalSheet.getRange(1, 1, 1, 8)
      .setFontWeight('bold')
      .setValues([headers]);
    externalSheet.setFrozenRows(1);

    if (!brigadeMembers.length) {
      return;
    }
    externalSheet
      .getRange(2, 1, brigadeMembers.length, brigadeMembers[0].length)
      .setValues(brigadeMembers);

    // resize and format columns
    externalSheet.getRange(1, headers.indexOf('Join Time') + 1, externalSheet.getLastRow(), 1)
      .setNumberFormat('m/d/yyyy h:mm:ss am/pm');
    externalSheet.getRange(1, headers.indexOf('Last Access Time') + 1, externalSheet.getLastRow(), 1)
      .setNumberFormat('m/d/yyyy h:mm:ss am/pm');
    externalSheet.autoResizeColumn(headers.indexOf('Name') + 1);
    externalSheet.autoResizeColumn(headers.indexOf('Email') + 1);
    externalSheet.autoResizeColumn(headers.indexOf('Join Time') + 1);
    externalSheet.autoResizeColumn(headers.indexOf('Last Access Time') + 1);
  });
}

function externalSheetSyncDonations() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforceDonations);
  const donationHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const donations = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

  EXTERNAL_SHEETS.forEach((brigade) => {
    const externalSheet = findOrCreateExternalSheet(brigade.sheetId, '[AUTO] Donations');
    const brigadeDonations = [];

    donations.forEach((donation) => {
      const donationBrigadeName = donation[donationHeaders.indexOf('Brigade Designation')];

      if (donationBrigadeName === brigade.name) {
        brigadeDonations.push([
          donation[donationHeaders.indexOf('Date')],
          donation[donationHeaders.indexOf('Name')],
          donation[donationHeaders.indexOf('Email')],
          donation[donationHeaders.indexOf('Amount')],
          donation[donationHeaders.indexOf('Description')],
        ]);
      }
    });

    const headers = ['Date', 'Name', 'Email', 'Amount', 'Description'];
    externalSheet.clearContents();
    externalSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setValues([headers]);
    externalSheet.setFrozenRows(1);

    if (!brigadeDonations.length) {
      return;
    }

    // populate actual data
    externalSheet
      .getRange(2, 1, brigadeDonations.length, brigadeDonations[0].length)
      .setValues(brigadeDonations);

    // resize and format columns
    externalSheet.autoResizeColumn(headers.indexOf('Name') + 1);
    externalSheet.autoResizeColumn(headers.indexOf('Email') + 1);
    externalSheet.getRange(1, headers.indexOf('Amount') + 1, externalSheet.getLastRow(), 1)
      .setNumberFormat('$0.00');
  });
}

function externalSheetSyncAll() {
  verifyExternalSheets();

  externalSheetAddInstructions();
  externalSheetSyncMeetup();
  externalSheetSyncDonations();
}

module.exports = {
  externalSheetSyncAll,
};
