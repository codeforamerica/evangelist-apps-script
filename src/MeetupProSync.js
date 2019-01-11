const {
  SHEET_NAMES,
} = require('./Code.js');
const MeetupClient = require('./meetup/MeetupClient');


const THREE_MONTHS_IN_MS = 3 * 30 * 24 * 60 * 60 * 1000;

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
      City: currentMember.city,
      State: currentMember.state,
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

  console.log('Clearing Meetup member range');
  if (incremental) {
    // prepend rows
    sheet.insertRowsBefore(2, membersToAppend.length);
  } else {
    // replace all rows
    sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clear();
  }

  console.log('Converting Meetup member data format');
  const rowsToAppend = membersToAppend
    .map(member => sheetHeaders.map(header => member[header] || ''));

  console.log('Replacing data with new Meetup members');
  sheet.getRange(2, 1, rowsToAppend.length, sheet.getLastColumn())
    .setValues(rowsToAppend);
}

function meetupProSyncMembersIncremental() {
  meetupProSyncMembers(true);
}

function meetupProSyncMembersAll() {
  meetupProSyncMembers(false);
}

function meetupProSyncEvents() {
  const client = new MeetupClient();
  const groups = client.meetupRequest('https://api.meetup.com/pro/brigade/groups?only=id,name,urlname').fetchAllPages();


  const eventsHeaders = [
    // [header name, function that gets value based on event object]
    ['Event ID', e => e.id],
    ['Name', e => e.name],
    ['Status', e => e.status],
    ['Date', e => e.local_date],
    ['Time', e => e.local_time],
    ['Timezone', e => e.group.timezone],
    ['Yes RSVPs', e => e.yes_rsvp_count],
    ['Link', e => e.link],
    ['Meetup Group ID', e => e.group.id],
    ['Meetup Group Name', e => e.group.name],
    ['Meetup Group Urlname', e => e.group.urlname],
  ];
  const events = [];
  const threeMonthsFromNow = new Date((new Date()).getTime() + THREE_MONTHS_IN_MS)
    .toISOString()
    .replace('Z', ''); // meetup can't handle the 'Z'

  /*
   * TODO: Use /batch endpoint so this doesn't make serial requests?
   */
  groups.forEach((group) => {
    events.push(...client.meetupRequest(`https://api.meetup.com/${group.urlname}/events?no_later_than=${threeMonthsFromNow}&scroll=recent_past&only=id,name,status,local_date,local_time,yes_rsvp_count,link,group`).body());
  });

  const eventsToAdd = events.map(e => eventsHeaders.map(([_, fn]) => fn(e)));

  SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_NAMES.meetupEvents)
    .clear()
    .getRange(1, 1, 1, eventsHeaders.length)
    .setValues([eventsHeaders.map(([header, _]) => header)])
    .getSheet()
    .getRange(2, 1, events.length, eventsHeaders.length)
    .setValues(eventsToAdd);
}

module.exports = {
  MEETUP_MEMBERSHIP_SPREADSHEET_ID,
  meetupProSyncMembersAll,
  meetupProSyncMembersIncremental,
  meetupProSyncEvents,
};
