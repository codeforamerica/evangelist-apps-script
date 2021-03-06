const { BrigadeList } = require('./Brigade');

const BRIGADE_LIST_SHEET_ID = SpreadsheetApp.getActive().getId();
const BRIGADE_LIST_SHEET_NAME = require('./Code').SHEET_NAMES.salesforce;

class UpdateFormBrigadeDropdown {
  static brigadeNames() {
    const salesforceSheet =
      SpreadsheetApp
        .openById(BRIGADE_LIST_SHEET_ID)
        .getSheetByName(BRIGADE_LIST_SHEET_NAME)
        .getDataRange()
        .getValues();

    return BrigadeList.fromSalesforceSheet(salesforceSheet)
      .brigades
      .filter(b => b.isActive)
      .map(b => b.name);
  }

  constructor(formId, fieldTitle) {
    this.form = FormApp.openById(formId);

    const matchingFields = this.form
      .getItems(FormApp.ItemType.LIST)
      .filter(i => i.getTitle().indexOf(fieldTitle) !== -1);
    if (matchingFields.length !== 1) {
      throw new Error(`ERROR: Could not find question in form: ${fieldTitle}`);
    }

    this.formField = matchingFields[0].asListItem(); // eslint-disable-line prefer-destructuring
  }

  updateField() {
    const brigadeListChoices = UpdateFormBrigadeDropdown
      .brigadeNames()
      .map(b => this.formField.createChoice(b));

    this.formField.setChoices(brigadeListChoices);
  }
}

module.exports = UpdateFormBrigadeDropdown;
