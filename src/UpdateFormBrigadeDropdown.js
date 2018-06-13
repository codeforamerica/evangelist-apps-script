const BRIGADE_LIST_SHEET_ID = SpreadsheetApp.getActive().getId();
const BRIGADE_LIST_SHEET_NAME = require('./Code.js').SHEET_NAMES.salesforce;

class UpdateFormBrigadeDropdown {
  constructor(formId, fieldTitle) {
    this.form = FormApp.openById(formId);

    const matchingFields = this.form
      .getItems(FormApp.ItemType.LIST)
      .filter(i => i.getTitle().indexOf(fieldTitle) !== -1);
    if (matchingFields.length !== 1) {
      throw new Error(`ERROR: Could not find question in form: ${fieldTitle}`);
    }

    this.formField = matchingFields[0]; // eslint-disable-line
  }

  updateField() {
    const brigadeListChoices =
      UpdateFormBrigadeDropdown.brigadeNames().map(b => this.formField.createChoice(b));

    this.formField.setChoices(brigadeListChoices);
  }

  // get list of brigades from salesforce sheet
  static brigadeNames() {
    const [
      salesforceHeaders,
      ...salesforceContents
    ] = SpreadsheetApp
      .openById(BRIGADE_LIST_SHEET_ID)
      .getSheetByName(BRIGADE_LIST_SHEET_NAME)
      .getDataRange()
      .getValues();
    const headerActiveIndex = salesforceHeaders.indexOf('Active?');
    const headerNameIndex = salesforceHeaders.indexOf('Name');

    return salesforceContents
      .filter(row => row[headerActiveIndex])
      .map(row => row[headerNameIndex]);
  }
}

module.exports = UpdateFormBrigadeDropdown;
