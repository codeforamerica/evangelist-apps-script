var MEETUP_API_KEY = PropertiesService.getScriptProperties().getProperty("MEETUP_API_KEY");
var EXTERNAL_SHEETS = {
  // urlname   : google sheet id
  "OpenOakland": "134_69wuLsB6kdOA3HctirpHRwwzxtSKun4xmyJqnFXM",
  "Code-for-Philly": "1Jx39wrbME94f30K8cADoBUCvQvWPtWssZpV978skb_s",
};

/*
Given a header like:
  Link: <https://api.meetup.com/pro/brigade/members?page=200&offset=1>; rel="next"
this will return:
  { url: "https://api.meetup.com/pro/brigade/members?page=200&offset=1", rel: "next" }
*/
var LINK_REGEXP = new RegExp('<([^>]+)>; rel="([a-zA-Z]+)"');
function _meetupParseLinkHeader(header) {
  var match = LINK_REGEXP.exec(header),
      url = match ? match[1] : null,
      rel = match ? match[2] : null;

  return {
    url: url,
    rel: rel
  }
}

function meetupRequest(url) {
  Logger.log("Beginning request for: " + url);
  if (url.indexOf('?') !== -1) {
    url = url + '&key=' + MEETUP_API_KEY;
  } else {
    url = url + '?key=' + MEETUP_API_KEY;
  }
  
  var response = UrlFetchApp.fetch(url);
  var headers = response.getAllHeaders();
  var links = {};
  Logger.log("  got response. Ratelimit Remaining: " + headers['x-ratelimit-remaining']);
  
  if (typeof headers['Link'] === 'string') {
    var parsedHeader = _meetupParseLinkHeader(headers['Link']);
    if (parsedHeader.rel) {
      links[parsedHeader.rel] = parsedHeader.url;
    } else {
      Logger.log("Error: could not parse link header: " + headers['Link']);
    }
  } else if (typeof headers['Link'] === 'object') {
    for (var i in headers['Link']) {
      var parsedHeader = _meetupParseLinkHeader(headers['Link'][i]);
      if (parsedHeader.rel) {
        links[parsedHeader.rel] = parsedHeader.url;
      } else {
        Logger.log("Error: could not parse link header: " + headers['Link'][i]);
      }
    }
  }

  return {
    response: JSON.parse(response.getContentText()),
    links: links,
  };
}

// converts a time like 1520367649000 to "2018-03-06 20:20:49"
function _convertMeetupTime(datetime) {
  var d = new Date(datetime);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()].join('-') +
    ' ' + [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].join(':');
}

function meetupProSyncToExternalSheets() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.meetupMembers);
  var memberHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var members = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  for (var brigade in EXTERNAL_SHEETS) {
    Logger.log("Syncing membership for " + brigade);
    var externalSheet = SpreadsheetApp.openById(EXTERNAL_SHEETS[brigade]).getSheetByName("[AUTO] Members");
    
    var brigadeMembers = [];
    
    for (var i in members) {
      var member = members[i];
      var memberChapters = JSON.parse(member[memberHeaders.indexOf("Chapters")]);
      for (var j in memberChapters) {
        if (memberChapters[j].urlname === brigade) {
          brigadeMembers.push([
            member[memberHeaders.indexOf("Meetup ID")],
            member[memberHeaders.indexOf("Full Name")],
            member[memberHeaders.indexOf("Email Address")],
            member[memberHeaders.indexOf("Events Attended")],
            _convertMeetupTime(member[memberHeaders.indexOf("Join Time")]),
            _convertMeetupTime(member[memberHeaders.indexOf("Last Access Time")]),
          ]);
        }
      }
    }
    
    externalSheet.clearContents();
    externalSheet.getRange(1, 1, 1, 8)
      .setValues([
        ['Meetup ID', 'Name', 'Email', 'Events Attended', 'Join Time', 'Last Access Time', '', "Last Updated: " + (new Date()).toDateString()],
      ]);
    
    if (!brigadeMembers.length) {
      return;
    }
    externalSheet
      .getRange(2, 1, brigadeMembers.length, brigadeMembers[0].length)
      .setValues(brigadeMembers);
  }
}

function meetupProSyncMembersIncremental() {
  meetupProSyncMembers(true);
}
      
function meetupProSyncMembersAll() {
  meetupProSyncMembers(false);
}

function meetupProSyncMembers(incremental) {
  incremental = incremental || false;

  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.meetupMembers);
  var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (incremental) {
    var mostRecentId = parseInt(sheet.getRange(2, sheetHeaders.indexOf('Meetup ID') + 1, 1, 1).getValues()[0][0]);
  } else {
    var mostRecentId = -1; // fake value that no member ID will ever be equal too
  }
  
  var currentPageRequest = meetupRequest('https://api.meetup.com/pro/brigade/members?page=200');
  var currentPageMembers = currentPageRequest.response;
  var currentMember = currentPageMembers.shift();
  var membersToAppend = [];
  while (currentMember.member_id !== mostRecentId) {
    // iterate through the member list beginning to end and add members as necessary
    membersToAppend.push({
      "Meetup ID": currentMember.member_id,
      "Full Name": currentMember.member_name,
      "Email Address": currentMember.email,
      "Events Attended": currentMember.events_attended,
      "Chapters": JSON.stringify(currentMember.chapters),
      "Join Time": currentMember.join_time,
      "Last Access Time": currentMember.last_access_time
    });
    
    if (currentPageMembers.length === 0) {
      if (currentPageRequest.links.next) {
        currentPageRequest = meetupRequest(currentPageRequest.links.next);
        currentPageMembers = currentPageRequest.response;
      } else {
        break;
      }
    }
    
    currentMember = currentPageMembers.shift();
  }
  
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
  
  var rowsToAppend = [];
  for (var i in membersToAppend) {
    var row = [];
    for (var j in sheetHeaders) {
      var value = membersToAppend[i][sheetHeaders[j]];
      row.push(typeof value !== 'undefined' ? value : '');
    }
    rowsToAppend.push(row);
  }
  sheet.getRange(2, 1, rowsToAppend.length, sheet.getLastColumn())
    .setValues(rowsToAppend);
}