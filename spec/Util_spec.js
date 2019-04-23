/* global describe it expect beforeEach */
const { csvRowsToJSON, dateToISO8601, rowsToCSV } = require('../src/Util');

describe('dateToISO8601', function() {
  it('converts dates', () => {
    expect(dateToISO8601(new Date(1530573195000))).toEqual('2018-07-02T23:13:15Z');
  });
});

describe('rowsToCSV', function() {
  beforeEach(() => {
    this.data = [
      ['header1', 'header2'],
      ['data1', 1234],
    ];
  });

  it('converts rows to CSV', () => {
    expect(rowsToCSV(this.data)).toEqual('header1,header2\ndata1,1234');
  });

  describe('escaping behavior', () => {
    it('escapes quotation marks', () => {
      expect(rowsToCSV([['row "quote here" data', 'other data']]))
        .toEqual('"row ""quote here"" data",other data')
    });

    it('quotes the fields containing commas', () => {
      expect(rowsToCSV([['123,456,789', 'other data']]))
        .toEqual('"123,456,789",other data')
    });

    it('quotes the fields containing newlines', () => {
      expect(rowsToCSV([['testing\nfoobar', 'other data']]))
        .toEqual('"testing\nfoobar",other data')
    });
  });
});

describe('csvRowsToJSON', function() {
  beforeEach(() => {
    this.data = [
      ['header1', 'header2'],
      ['data1', 'data2'],
    ];
  });

  it('converts a 2d array to JavaScript objects', () => {
    const result = csvRowsToJSON(this.data);
    expect(result[0].header1).toEqual('data1');
    expect(result[0].header2).toEqual('data2');
  });
});
