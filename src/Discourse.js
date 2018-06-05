const { SHEET_NAMES } = require('./Code.js');
const DISCOURSE_ROOT_URL = 'https://discourse.codeforamerica.org';

/*
 * Make a request to Discourse
 * @param method {String} HTTP method like 'GET'
 * @param path {String} Request Path starting with '/'
 * @param payload {Object} Object which will be sent as JSON.
 */
const discourseRequest = function(method, path, payload) {
  const apiUsername = ScriptProperties.getProperty('DISCOURSE_API_USERNAME');
  const apiKey = ScriptProperties.getProperty('DISCOURSE_API_KEY');

  const pathWithAuth = path + `?api_key=${apiKey}&api_username=${apiUsername}`;
  const options = {
    method: method.toLowerCase(),
    headers: {},
  };

  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  return UrlFetchApp.fetch(DISCOURSE_ROOT_URL + pathWithAuth, options)
};

module.exports = {
  discourseSyncBrigadeList() {
    const brigades =
      SpreadsheetApp
        .getActive()
        .getSheetByName(SHEET_NAMES.salesforce)
        .getDataRange()
        .getValues();
    const headers = brigades.shift();
    const activeColumn = headers.indexOf('Active?');
    const nameColumn = headers.indexOf('Name');

    const response = discourseRequest('PUT', '/admin/customize/user_fields/1', {
      user_field: {
        name: 'Brigade',
        description: 'If you are a member of a Brigade, which one?',
        field_type: 'dropdown',
        editable: true,
        required: false,
        show_on_profile: true,
        show_on_user_card: true,
        options: brigades.filter(b => b[activeColumn]).map(b => b[nameColumn]),
      },
    });

    if (response.getResponseCode() < 300) {
      console.log('Successfully updated Discourse User Field with latest brigade list.');
    } else {
      throw new Error('Got error updating Discourse: ' + response.getContentText());
    }
  }
};
