const {
  SHEET_NAMES,
} = require('./Code.js');

const MEETUP_API_KEY = PropertiesService.getScriptProperties().getProperty('MEETUP_API_KEY');

/*
 * Due to Google Sheet's 2 million cell limit, we need to separate this into its own
 * spreadsheet. (It also helps with performance.)
 */
const MEETUP_MEMBERSHIP_SPREADSHEET_ID = '1SXzEeKQAHXB22lmXQvf9G2aVmyY9x4zkYG7fRCAw30c';

/*
Given a header like:
  Link: <https://api.meetup.com/pro/brigade/members?page=200&offset=1>; rel="next"
this will return:
  { url: "https://api.meetup.com/pro/brigade/members?page=200&offset=1", rel: "next" }
*/
const LINK_REGEXP = new RegExp('<([^>]+)>; rel="([a-zA-Z]+)"');
function meetupParseLinkHeader(header) {
  const match = LINK_REGEXP.exec(header);
  const url = match ? match[1] : null;
  const rel = match ? match[2] : null;

  return {
    header,
    url,
    rel,
  };
}


function meetupRequest(url) {
  console.log(`Beginning request for: ${url}`);

  let urlWithKey;
  if (url.indexOf('?') !== -1) {
    urlWithKey = `${url}&key=${MEETUP_API_KEY}`;
  } else {
    urlWithKey = `${url}?key=${MEETUP_API_KEY}`;
  }

  let response;
  let success = false;
  let retries = 3;
  while (!success && retries > 0) {
    try {
      response = UrlFetchApp.fetch(urlWithKey);
      success = true;
    } catch (e) {
      if (e.message.match(/Address unavailable/) && response && response.getResponseCode() === 200) {
        console.log(`  Got error: ${e.message} but response was 200. Swallowing exception and continuing.`);
      } else {
        retries -= 1;
        // with 2 retries left, sleep 1 second
        // with 1 retry left, sleep 6 seconds
        // with 0 retries left, sleep 11 seconds
        const delayMs = (1 + (5 * (2 - retries))) * 1000;
        console.log(`  Got error: ${e.message}. Retrying in ${delayMs} ms.`);
        Utilities.sleep(delayMs);
      }
    }
  }

  if (!success) {
    throw new Error('  Error fetching Meetup members. Retried 3 times to no avail.');
  }

  const headers = response.getAllHeaders();
  const links = {};
  const responseBytes = response.getContent().length;
  console.log(`  Got response (Status: ${response.getResponseCode()}; Size: ${responseBytes}b; Ratelimit: ${headers['x-ratelimit-remaining']}/${headers['x-ratelimit-limit']}; Reset in ${headers['x-ratelimit-reset']})`);

  if (typeof headers.Link === 'string') {
    const parsedHeader = meetupParseLinkHeader(headers.Link);
    if (parsedHeader.rel) {
      links[parsedHeader.rel] = parsedHeader.url;
    } else {
      console.eror(`Could not parse link header: ${headers.Link}`);
    }
  } else if (typeof headers.Link === 'object') { // it's actually an array, but arrays are objects
    headers.Link
      .map(meetupParseLinkHeader)
      .forEach((parsedHeader) => {
        if (parsedHeader.rel) {
          links[parsedHeader.rel] = parsedHeader.url;
        } else {
          console.error(`Could not parse link header: ${parsedHeader.header}`);
        }
      });
  }

  let recommendedSleepMs;
  if (parseInt(headers['x-ratelimit-remaining'], 10) >= 10) {
    recommendedSleepMs = 0;
  } else {
    recommendedSleepMs = 1000 * (parseInt(headers['x-ratelimit-remaining'], 10) <= 1 ?
      parseInt(headers['x-ratelimit-reset'], 10) :
      parseFloat(headers['x-ratelimit-reset']) / parseInt(headers['x-ratelimit-limit'], 10));
  }

  return {
    response: JSON.parse(response.getContentText()),
    links,
    recommendedSleepMs,
  };
}

// converts a time like 1520367649000 to "2018-03-06 20:20:49"
function convertMeetupTime(datetime) {
  const d = new Date(datetime);
  return `${[d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()].join('-')
  } ${[d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].join(':')}`;
}

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

  let currentPageRequest = meetupRequest('https://api.meetup.com/pro/brigade/members?page=200');
  let currentPageMembers = currentPageRequest.response;
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
      if (currentPageRequest.links.next) {
        if (currentPageRequest.recommendedSleepMs > 0) {
          console.info(`Throttling for ${currentPageRequest.recommendedSleepMs} ms before next request.`);
        }

        Utilities.sleep(currentPageRequest.recommendedSleepMs);
        currentPageRequest = meetupRequest(currentPageRequest.links.next);
        currentPageMembers = currentPageRequest.response;
      } else {
        break;
      }
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
