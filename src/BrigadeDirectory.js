const assign = require('core-js/library/fn/object/assign');
const values = require('core-js/library/fn/object/values');

const {
  SHEET_NAMES,
} = require('./Code');
const { BrigadeList } = require('./Brigade');

const DATABASE_DOC_ID = '1zglhAKDUNnvKindAhb6K_DJaLQ_myRYGKvE2DTYolAQ';
const DATABASE_INTERNAL_DOC_ID = '12o5V69MMiYO6sls5V4FLN1_gtgquVlr3mzrncHvQZzI';
const DATABASE_AUTO_SHEET_NAME = 'Brigade Contact Info';

class BrigadeDirectory {
  constructor(brigadeList, isInternal = false) {
    this.brigadeList = brigadeList;
    this.isInternal = isInternal;
  }

  headers() {
    const headers = {
      'Brigade Name': b => b.name,
      City: b => b.city,
      State: b => b.state,
      Region: b => b.region,
      'Primary Contact Name': b => b.primaryContactName,
      [[(this.isInternal ? 'Primary Contact Email' : 'Public Contact Email')]]:
      (b) => {
        // if the brigade has given us an explicit public email address, use that
        // instead of the primary contact in salesforce.
        if (b.publicContactEmail && !this.isInternal) {
          return b.publicContactEmail;
        }

        return b.primaryContactEmail;
      },
      Website: b => b.website,
      Twitter: b => b.twitter,
      'Facebook Page URL': b => b.facebookPageUrl,
      'GitHub URL': b => b.githubUrl,
      'Meetup URL': b => b.meetupUrl,
    };

    if (this.isInternal) {
      assign(headers, {
        'Salesforce Account ID': b => b.salesforceAccountId,
      });
    }

    return headers;
  }

  brigadesToAdd() {
    return this.brigadeList
      .brigades
      .filter(b => b.isActive)
      .map(b => values(this.headers()).map(fn => fn(b) || ''));
  }

  writeToSheet(sheet) {
    const headers = this.headers();
    sheet.clear();
    const descriptionRange = sheet.getRange(1, 1, 1, 5);
    const brigadesToAdd = this.brigadesToAdd();

    if (this.isInternal) {
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
    sheet.getRange(2, 1, 1, Object.keys(headers).length)
      .setValues([Object.keys(headers)])
      .setFontWeight('bold');
    sheet.setFrozenRows(2);
    sheet.setFrozenColumns(1);
    sheet
      .getRange(3, 1, brigadesToAdd.length, Object.keys(headers).length)
      .setValues(brigadesToAdd);
  }
}

function importSalesforceToDirectory(isInternal) {
  const salesforceData = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_NAMES.salesforce)
    .getDataRange()
    .getValues();
  const databaseSheet = SpreadsheetApp
    .openById(isInternal ? DATABASE_INTERNAL_DOC_ID : DATABASE_DOC_ID)
    .getSheetByName(DATABASE_AUTO_SHEET_NAME);

  const salesforceBrigades = BrigadeList.fromSalesforceSheet(salesforceData);
  (new BrigadeDirectory(salesforceBrigades, isInternal))
    .writeToSheet(databaseSheet);
}

function importExternalSalesforceToDirectory() {
  importSalesforceToDirectory(false);
}

function importInternalSalesforceToDirectory() {
  importSalesforceToDirectory(true);
}

/*
 * Test all URLs in the directory (database).
 *
 * @param brigadeList {BrigadeList}
 */
function databaseTestBrigadeURLs(brigadeList) {
  brigadeList.brigades.forEach((brigade) => {
    const url = brigade.website;

    if (url && url.length) {
      try {
        const resp = UrlFetchApp.fetch(brigade.website);
        if (resp.getResponseCode() >= 300) {
          Logger.log(`Brigade Website Error: ${brigade.name}'s website ${url} returned status ${resp.getResponseCode()}`);
        }
      } catch (ex) {
        Logger.log(`Brigade Website Error: ${brigade.name}'s website ${url} returned error ${ex.message}`);
      }
    }
  });
}

module.exports = {
  BrigadeDirectory,
  databaseTestBrigadeURLs,
  importExternalSalesforceToDirectory,
  importInternalSalesforceToDirectory,
};
