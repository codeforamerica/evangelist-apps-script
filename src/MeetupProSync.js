const {
  SHEET_NAMES,
} = require('./Code.js');
const { convertMeetupTime } = require('./meetup/MeetupUtil');
const MeetupClient = require('./meetup/MeetupClient');

/*
 * Due to Google Sheet's 2 million cell limit, we need to separate this into its own
 * spreadsheet. (It also helps with performance.)
 */
const MEETUP_MEMBERSHIP_SPREADSHEET_ID = '1SXzEeKQAHXB22lmXQvf9G2aVmyY9x4zkYG7fRCAw30c';

function meetupProSyncMembers(incremental) {
  const sheet = SpreadsheetApp.openById(MEETUP_MEMBERSHIP_SPREADSHEET_ID)
    .getSheetByName(SHEET_NAMES.meetupMembers);
  const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  let mostRecentId;

  if (incremental) {
    mostRecentId = parseInt(sheet.getRange(2, sheetHeaders.indexOf('Meetup ID') + 1, 1, 1).getValues()[0][0], 10);
  } else {
    mostRecentId = -1; // fake value that no member ID will ever be equal too
  }

  const client = new MeetupClient();
  let currentPageRequest = client.meetupRequest('https://api.meetup.com/pro/brigade/members?page=200');
  let currentPageMembers = currentPageRequest.body();
  let currentMember = currentPageMembers.shift();
  const membersToAppend = [];
  while (currentMember.member_id !== mostRecentId) {
    // iterate through the member list beginning to end and add members as necessary
    membersToAppend.push({
      'Meetup ID': currentMember.member_id,
      'Full Name': currentMember.member_name,
      'Email Address': currentMember.email,
      'Events Attended': currentMember.events_attended,
      Chapters: JSON.stringify(currentMember.chapters),
      'Join Time': currentMember.join_time,
      'Last Access Time': currentMember.last_access_time,
    });

    if (currentPageMembers.length === 0) {
      if (!currentPageRequest.hasNextPage()) {
        break;
      }

      currentPageRequest = currentPageRequest.requestNextPage();
      currentPageMembers = currentPageRequest.body();
    }

    currentMember = currentPageMembers.shift();
  }

  console.log(`Done fetching Meetup members -- found ${membersToAppend.length}${incremental ? ' to append' : ' total'}`);
  if (membersToAppend.length === 0) {
    return; // nothing left to do here!
  }

  if (incremental) {
    // prepend rows
    sheet.insertRowsBefore(2, membersToAppend.length);
  } else {
    // replace all rows
    sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clear();
  }

  const rowsToAppend = membersToAppend
    .map(member => sheetHeaders.map(header => member[header] || ''));

  sheet.getRange(2, 1, rowsToAppend.length, sheet.getLastColumn())
    .setValues(rowsToAppend);
}

function meetupProSyncMembersIncremental() {
  meetupProSyncMembers(true);
}

function meetupProSyncMembersAll() {
  meetupProSyncMembers(false);
}

module.exports = {
  MEETUP_MEMBERSHIP_SPREADSHEET_ID,
  convertMeetupTime,
  meetupProSyncMembersAll,
  meetupProSyncMembersIncremental,
};
