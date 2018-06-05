const {
  SHEET_NAMES,
} = require('./Code.js');

const SLACK_SIGNUP_FORM_ID = '17BXzqiA_cYAfpDSILHDnlavQOXV8kHgsYWp4f8ayUt4';

module.exports = {
  slackSignupForm() {
    const form = FormApp.openById(SLACK_SIGNUP_FORM_ID);

    let brigadeListItem = form
      .getItems(FormApp.ItemType.LIST)
      .filter(i => i.getTitle().indexOf('which Brigade do you attend?') !== -1);

    if (brigadeListItem.length !== 1) {
      throw new Error('ERROR: Could not find brigade Slack question in signup form');
    }

    brigadeListItem = brigadeListItem[0].asListItem();

    // get list of brigades from salesforce sheet
    const salesforceContents = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce)
      .getDataRange().getValues();
    const salesforceHeaders = salesforceContents.shift();
    const headerActiveIndex = salesforceHeaders.indexOf('Active?');
    const headerNameIndex = salesforceHeaders.indexOf('Name');

    const brigadeListChoices = salesforceContents
      .filter(row => row[headerActiveIndex])
      .map(row => brigadeListItem.createChoice(row[headerNameIndex]));

    brigadeListItem.setChoices(brigadeListChoices);
  },
};
