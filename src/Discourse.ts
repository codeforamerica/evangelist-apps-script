import { BrigadeList } from './Brigade';
import { SHEET_NAMES } from './Code';

const DISCOURSE_ROOT_URL = 'https://discourse.codeforamerica.org';

/*
 * Make a request to Discourse
 * @param method {String} HTTP method like 'GET'
 * @param path {String} Request Path starting with '/'
 * @param payload {Object} Object which will be sent as JSON.
 */
const discourseRequest = function discourseRequest(method, path, payload) {
  const apiUsername = PropertiesService.getScriptProperties().getProperty('DISCOURSE_API_USERNAME');
  const apiKey = PropertiesService.getScriptProperties().getProperty('DISCOURSE_API_KEY');

  const pathWithAuth = `${path}?api_key=${apiKey}&api_username=${apiUsername}`;
  const options = {
    method: method.toLowerCase(),
    headers: {},
    payload: '',
  };

  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  return UrlFetchApp.fetch(DISCOURSE_ROOT_URL + pathWithAuth, options);
};

export function discourseSyncBrigadeList() {
  const salesforceSheet =
    SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_NAMES.salesforce)
    .getDataRange()
    .getValues();
  const activeBrigadeNames =
    BrigadeList
    .fromSalesforceSheet(salesforceSheet)
    .brigades
    .filter(b => b.isActive)
    .map(b => b.name);

  const response = discourseRequest('PUT', '/admin/customize/user_fields/1', {
    user_field: {
      name: 'Brigade',
      description: 'If you are a member of a Brigade, which one?',
      field_type: 'dropdown',
      editable: true,
      required: false,
      show_on_profile: true,
      show_on_user_card: true,
      options: activeBrigadeNames,
    },
  });

  if (response.getResponseCode() < 300) {
    console.log('Successfully updated Discourse User Field with latest brigade list.');
  } else {
    throw new Error(`Got error updating Discourse: ${response.getContentText()}`);
  }
};
