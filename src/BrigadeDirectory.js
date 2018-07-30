const values = require('core-js/library/fn/object/values');
const find = require('core-js/library/fn/array/find');
const {
  SHEET_NAMES,
} = require('./Code.js');

const DATABASE_DOC_ID = '1zglhAKDUNnvKindAhb6K_DJaLQ_myRYGKvE2DTYolAQ';
const DATABASE_INTERNAL_DOC_ID = '12o5V69MMiYO6sls5V4FLN1_gtgquVlr3mzrncHvQZzI';
const DATABASE_SHEET_NAME = 'Brigade Contact Info';
const DATABASE_AUTO_SHEET_NAME = 'Brigade Contact Info';

class Brigade {
  constructor(
    name, isActive, city, state, primaryContactName, primaryContactEmail,
    publicContactEmail, website, twitter, facebookPageUrl, githubUrl,
    meetupUrl, saleforceAccountId,
  ) {
    this.name = name;
    this.isActive = isActive;
    this.city = city;
    this.state = state;
    this.primaryContactName = primaryContactName;
    this.primaryContactEmail = primaryContactEmail;
    this.publicContactEmail = publicContactEmail;
    this.website = website;
    this.twitter = twitter;
    this.facebookPageUrl = facebookPageUrl;
    this.githubUrl = githubUrl;
    this.meetupUrl = meetupUrl;
    this.saleforceAccountId = saleforceAccountId;
  }
}

class BrigadeList {
  constructor(brigades) {
    this.brigades = brigades;
  }

  /*
   * @param {Array} salesforceSheet A 2-dimensional array that represents the
   * "AUTO:salesforce" sheet's contents.
   */
  static fromSalesforceSheet(salesforceSheet) {
    const [salesforceHeaders, ...salesforceContents] = salesforceSheet;

    return new BrigadeList(salesforceContents.map(row => new Brigade(
      row[salesforceHeaders.indexOf('Brigade Name')],
      row[salesforceHeaders.indexOf('Active?')],
      row[salesforceHeaders.indexOf('Location')].split(', ')[0], // city
      row[salesforceHeaders.indexOf('Location')].split(', ')[1], // state
      row[salesforceHeaders.indexOf('Primary Contact')],
      row[salesforceHeaders.indexOf('Primary Contact Email')],
      row[salesforceHeaders.indexOf('Website')],
      row[salesforceHeaders.indexOf('Twitter')],
      row[salesforceHeaders.indexOf('Facebook Page URL')],
      row[salesforceHeaders.indexOf('GitHub URL')],
      row[salesforceHeaders.indexOf('Meetup URL')],
      row[salesforceHeaders.indexOf('Salesforce Account ID')],
    )));
  }
}

// check fields for equality
const FIELDS = [
  // salesforce column name, database column name
  ['Brigade Name', 'Brigade Name'],
  ['Website', 'Website'],
  ['Meetup URL', 'Meetup URL'],
  ['Twitter', 'Twitter'],
  ['Facebook Page URL', 'Facebook Page URL'],
  ['GitHub URL', 'GitHub URL'],
];

function importSalesforceToDirectory(isInternal) {
  const HEADERS = {
    'Brigade Name': b => b.name,
    City: b => b.city,
    State: b => b.state,
    'Primary Contact Name': b => b.primaryContactName,
    [[(isInternal ? 'Primary Contact Email' : 'Public Contact Email')]]:
      (b) => {
        // if the brigade has given us an explicit public email address, use that
        // instead of the primary contact in salesforce.
        if (b.publicContactEmail && !isInternal) {
          return b.publicContactEmail;
        }

        return b.primaryContactEmail;
      },
    Website: b => b.website,
    Twitter: b => b.twitter,
    'Facebook Page URL': b => b.facebookPageUrl,
    'GitHub URL': b => b.githubUrl,
    'Meetup URL': b => b.meetupUrl,
    // 'Slack Invite URL',
    // 'Active Project Categories',
    // 'Meeting Time(s)',
    // 'Meeting Location',
    'Salesforce Account ID': b => b.salesforceAccountId,
  };

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
  database.getRange(2, 1, 1, Object.keys(HEADERS).length)
    .setValues([Object.keys(HEADERS)])
    .setFontWeight('bold');
  database.setFrozenRows(2);
  database.setFrozenColumns(1);

  const salesforceSheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.salesforce);
  const salesforceBrigades =
    BrigadeList.fromSalesforceSheet(salesforceSheet.getDataRange().getValues());

  const brigadesToAdd = [];

  salesforceBrigades.brigades.forEach((brigade) => {
    if (!brigade.isActive) {
      return;
    }

    brigadesToAdd.push(values(HEADERS).map(fn => fn(brigade) || ''));
  });

  database
    .getRange(3, 1, brigadesToAdd.length, Object.keys(HEADERS).length)
    .setValues(brigadesToAdd);
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
    //   by matching the Salesforce Account ID
    const brigadeInSalesforce = find(salesforceContents, (b) => {
      const salesforceId = b[salesforceHeaders.indexOf('Salesforce Account ID')];
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
      const salesforceId = brigade[salesforceHeaders.indexOf('Salesforce Account ID')];
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
