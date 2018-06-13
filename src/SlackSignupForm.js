/*
 * SlackSignupForm
 *
 * Handles the logic of updating the Slack Signup form with the updated brigade
 * list.
 *
 * TODO: Migrate this into UpdateFormBrigadeDropdown.js
 */
class SlackSignupForm {
  constructor(brigadeListId, brigadeListSheetName, formId) {
    this.brigadeListId = brigadeListId;
    this.brigadeListSheetName = brigadeListSheetName;
    this.form = FormApp.openById(formId);
  }

  fetchBrigadeList() {
    // get list of brigades from salesforce sheet
    const salesforceContents = SpreadsheetApp
      .openById(this.brigadeListId)
      .getSheetByName(this.brigadeListSheetName)
      .getDataRange()
      .getValues();
    const salesforceHeaders = salesforceContents.shift();
    const headerActiveIndex = salesforceHeaders.indexOf('Active?');
    const headerNameIndex = salesforceHeaders.indexOf('Name');

    return salesforceContents
      .filter(row => row[headerActiveIndex])
      .map(row => row[headerNameIndex]);
  }

  fetchFormQuestion() {
    return this.form
      .getItems(FormApp.ItemType.LIST)
      .filter(i => i.getTitle().indexOf('which Brigade do you attend?') !== -1);
  }

  updateField() {
    let brigadeListItem = this.fetchFormQuestion();
    if (brigadeListItem.length !== 1) {
      throw new Error('ERROR: Could not find brigade Slack question in signup form');
    }
    brigadeListItem = brigadeListItem[0].asListItem();

    const brigadeListChoices =
      this.fetchBrigadeList().map(b => brigadeListItem.createChoice(b));

    brigadeListItem.setChoices(brigadeListChoices);
  }
}

module.exports = SlackSignupForm;
