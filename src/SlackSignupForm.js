const SLACK_SIGNUP_FORM_ID = '17BXzqiA_cYAfpDSILHDnlavQOXV8kHgsYWp4f8ayUt4';

module.exports = {
  slackSignupForm() {
    const form = FormApp.openById(SLACK_SIGNUP_FORM_ID);

    var brigadeListItem = form.getItems(FormApp.ItemType.LIST).filter(i => i.getTitle().indexOf('which Brigade do you attend?') !== -1);

    if (brigadeListItem.length !== 1) {
      Logger.log('ERROR: Could not find brigade question in signup form');
      return;
    }

    var brigadeListItem = brigadeListItem[0].asListItem();

    // get list of brigades from salesforce sheet
    const salesforce = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);
    const salesforceHeaders = salesforce.getRange(1, 1, 1, salesforce.getLastColumn()).getValues()[0];
    const salesforceContents = salesforce.getRange(2, 1, salesforce.getLastRow(), salesforce.getLastColumn())
      .getValues();

    const brigadeListChoices = [];
    for (const i in salesforceContents) {
      const brigade = salesforceContents[i];
      const isActive = brigade[salesforceHeaders.indexOf('Active?')];

      if (!isActive) {
        continue;
      }

      brigadeListChoices.push(brigadeListItem.createChoice(brigade[salesforceHeaders.indexOf('Name')]));
    }

    brigadeListItem.setChoices(brigadeListChoices);
  }
};
