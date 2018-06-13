const {
  SHEET_NAMES,
} = require('./Code.js');

const DATABASE_DOC_ID = '1zglhAKDUNnvKindAhb6K_DJaLQ_myRYGKvE2DTYolAQ';
const DATABASE_INTERNAL_DOC_ID = '12o5V69MMiYO6sls5V4FLN1_gtgquVlr3mzrncHvQZzI';
const DATABASE_SHEET_NAME = 'Brigade Contact Info';
const DATABASE_AUTO_SHEET_NAME = 'Brigade Contact Info';

// check fields for equality
const FIELDS = [
  // salesforce column name, database column name
  ['Name', 'Brigade Name'],
  ['Website URL', 'Website'],
  ['Meetup Link', 'Meetup URL'],
  ['Twitter', 'Twitter'],
  ['Facebook Page URL', 'Facebook Page URL'],
  ['Github URL', 'GitHub URL'],
];

function importSalesforceToDirectory(isInternal) {
  const HEADERS = [
    'Brigade Name',
    'City',
    'State',
    'Primary Contact Name',
    (isInternal ? 'Primary Contact Email' : 'Public Contact Email'),
    'Website',
    'Twitter',
    'Facebook Page URL',
    'GitHub URL',
    'Meetup URL',
    // 'Slack Invite URL',
    // 'Active Project Categories',
    // 'Meeting Time(s)',
    // 'Meeting Location',
    'Salesforce Account ID',
  ];

  const database = SpreadsheetApp
    .openById(isInternal ? DATABASE_INTERNAL_DOC_ID : DATABASE_DOC_ID)
    .getSheetByName(DATABASE_AUTO_SHEET_NAME);
  database.clear();
  const descriptionRange = database.getRange(1, 1, 1, 5);
  if (isInternal) {
    descriptionRange.setValues([[
      `Last Updated: ${(new Date()).toDateString()}`,
      'This internal version includes primary contact emails that are not necessarily public.',
      '', '', '',
    ]]);
  } else {
    descriptionRange.setValues([[
      `Last Updated: ${(new Date()).toDateString()}`,
      'Available At:', 'http://c4a.me/brigades',
      '', // spacer
      'See "Instructions" Tab For Editing Instructions',
    ]]);
  }
  database.getRange(2, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold');
  database.setFrozenRows(2);
  database.setFrozenColumns(1);

  const salesforce = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);
  const salesforceContents = salesforce.getDataRange().getValues();
  const salesforceHeaders = salesforceContents.shift();

  const brigadesToAdd = [];

  salesforceContents.forEach((brigade) => {
    const isActive = brigade[salesforceHeaders.indexOf('Active?')];
    if (!isActive) {
      return;
    }

    let primaryContactEmail;
    // if the brigade has given us an explicit public email address, use that (with no "name")
    //   instead of the primary contact in salesforce.
    if (brigade[salesforceHeaders.indexOf('Public Contact Email')] && !isInternal) {
      primaryContactEmail = brigade[salesforceHeaders.indexOf('Public Contact Email')];
    } else {
      primaryContactEmail = brigade[salesforceHeaders.indexOf('Primary Contact Email')];
    }

    const brigadeObject = {
      'Brigade Name': brigade[salesforceHeaders.indexOf('Name')],
      City: brigade[salesforceHeaders.indexOf('Location')].split(', ')[0],
      State: brigade[salesforceHeaders.indexOf('Location')].split(', ')[1],
      'Primary Contact Name': brigade[salesforceHeaders.indexOf('Primary Contact')],
      'Primary Contact Email': primaryContactEmail,
      'Public Contact Email': primaryContactEmail,
      Website: brigade[salesforceHeaders.indexOf('Website URL')],
      Twitter: brigade[salesforceHeaders.indexOf('Twitter')],
      'Facebook Page URL': brigade[salesforceHeaders.indexOf('Facebook Page URL')],
      'GitHub URL': brigade[salesforceHeaders.indexOf('Github URL')],
      'Meetup URL': brigade[salesforceHeaders.indexOf('Meetup Link')],
      'Salesforce Account ID': brigade[salesforceHeaders.indexOf('Salesforce ID')],
    };

    brigadesToAdd.push(HEADERS.map(header => brigadeObject[header] || ''));
  });

  database.getRange(3, 1, brigadesToAdd.length, HEADERS.length).setValues(brigadesToAdd);
}

function importExternalSalesforceToDirectory() {
  importSalesforceToDirectory(false);
}

function importInternalSalesforceToDirectory() {
  importSalesforceToDirectory(true);
}

function compareDatabaseAndSalesforce() {
  const database = SpreadsheetApp.openById(DATABASE_DOC_ID).getSheetByName(DATABASE_SHEET_NAME);
  const salesforce = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);

  const salesforceContents = salesforce.getDataRange().getValues();
  const salesforceHeaders = salesforceContents.shift();

  const [
    , // ignore above-header line
    databaseHeaders,
    ...databaseContents
  ] = database.getDataRange().getValues();

  databaseContents.forEach((brigade) => {
    // attempt to find the brigade in the salesforce list
    //   by matching the Salesforce ID
    const brigadeInSalesforce = salesforceContents.find((b) => {
      const salesforceId = b[salesforceHeaders.indexOf('Salesforce ID')];
      const databaseId = brigade[databaseHeaders.indexOf('Salesforce Account ID')];
      const salesforceName = b[salesforceHeaders.indexOf('Name')];
      const databaseName = brigade[databaseHeaders.indexOf('Brigade Name')];

      if (salesforceId === databaseId) {
        return true;
      } else if (salesforceName === databaseName) {
        Logger.log(`Found by fallback name match: ${salesforceName}`);
        return true;
      }

      return false;
    });

    if (!brigadeInSalesforce) {
      Logger.log(`Could not find brigade in salesforce: ${brigade[0]}`);
      return;
    }

    const different = [];
    FIELDS.forEach((field) => {
      const fieldName = field[0];
      const salesforceValue = brigadeInSalesforce[salesforceHeaders.indexOf(field[0])];
      const databaseValue = brigade[databaseHeaders.indexOf(field[1])];

      if (salesforceValue !== databaseValue) {
        different.push([fieldName, salesforceValue, databaseValue]);
      }
    });

    if (different.length) {
      Logger.log(`${brigade[databaseHeaders.indexOf('Brigade Name')]}:`);

      different.forEach(([fieldName, salesforceValue, databaseValue]) => {
        if (salesforceValue && !databaseValue) {
          Logger.log(`  ${fieldName} missing in brigade database: ${salesforceValue}`);
        } else if (databaseValue && !salesforceValue) {
          Logger.log(`  ${fieldName} missing in salesforce: ${databaseValue}`);
        } else {
          Logger.log(`  ${fieldName} different: ${salesforceValue}/${databaseValue}`);
        }
      });
    }
  });

  // find records that are in salesforce but not the database
  salesforceContents.forEach((brigade) => {
    const isActive = brigade[salesforceHeaders.indexOf('Active?')];

    if (!isActive) {
      return;
    }

    let brigadeInDatabase = null;
    databaseContents.forEach((b) => {
      const salesforceId = brigade[salesforceHeaders.indexOf('Salesforce ID')];
      const databaseId = b[databaseHeaders.indexOf('Salesforce Account ID')];
      const salesforceName = brigade[salesforceHeaders.indexOf('Name')];
      const databaseName = b[databaseHeaders.indexOf('Brigade Name')];

      if (salesforceId === databaseId) {
        brigadeInDatabase = b;
      } else if (salesforceName === databaseName) {
        brigadeInDatabase = b;
      }
    });

    if (!brigadeInDatabase) {
      Logger.log(`Missing Brigade in Database: ${brigade[salesforceHeaders.indexOf('Name')]}`);
    }
  });
}

/*
 * Test all URLs in the directory (database).
 */
function databaseTestBrigadeURLs() {
  const database = SpreadsheetApp.openById(DATABASE_DOC_ID).getSheetByName(DATABASE_SHEET_NAME);

  const databaseHeaders = database.getRange(2, 1, 1, database.getLastColumn()).getValues()[0];
  const databaseContents = database.getRange(3, 1, database.getLastRow(), database.getLastColumn())
    .getValues();

  databaseContents.forEach((row) => {
    const brigadeName = row[databaseHeaders.indexOf('Brigade Name')];
    const url = row[databaseHeaders.indexOf('Website')];

    if (url && url.length) {
      try {
        const resp = UrlFetchApp.fetch(url);
        if (resp.getResponseCode() >= 300) {
          Logger.log(`Brigade Website Error: ${brigadeName}'s website ${url} returned status ${resp.getResponseCode()}`);
        }
      } catch (ex) {
        Logger.log(`Brigade Website Error: ${brigadeName}'s website ${url} returned error ${ex.message}`);
      }
    }
  });
}

module.exports = {
  compareDatabaseAndSalesforce,
  databaseTestBrigadeURLs,
  importExternalSalesforceToDirectory,
  importInternalSalesforceToDirectory,
};
