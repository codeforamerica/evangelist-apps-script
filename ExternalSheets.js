/*
 * Code related to syndicating the results into Brigade-specific external sheets.
 *
 */
var EXTERNAL_SHEETS = {
  // urlname   : google sheet id
  "OpenOakland": "134_69wuLsB6kdOA3HctirpHRwwzxtSKun4xmyJqnFXM",
  "Code-for-Philly": "1Jx39wrbME94f30K8cADoBUCvQvWPtWssZpV978skb_s",
};

/*
 * Open an external spreadsheet and return an existing sheet by name
 *   or create it if it doesn't exist.
 */
function _findOrCreateExternalSheet(id, name) {
  var doc = SpreadsheetApp.openById(id);
  var externalSheet = doc.getSheetByName(name);
  if (!externalSheet) {
    var externalSheet = doc.insertSheet(name);
  }
  return externalSheet;
}

function meetupProSyncToExternalSheets() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.meetupMembers);
  var memberHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var members = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  for (var brigade in EXTERNAL_SHEETS) {
    Logger.log("Syncing membership for " + brigade);
    var externalSheet = _findOrCreateExternalSheet(EXTERNAL_SHEETS[brigade], "[AUTO] Members");
    
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