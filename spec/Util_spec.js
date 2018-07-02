/* global describe it expect beforeEach */
const { csvRowsToJSON, dateToISO8601, rowsToCSV } = require('../src/Util');

describe('dateToISO8601', () => {
  it('converts dates', () => {
    expect(dateToISO8601(new Date(1530573195000))).toEqual('2018-07-02T23:13:15Z');
  });
});

describe('rowsToCSV', () => {
  beforeEach(() => {
    this.data = [
      ['header1', 'header2'],
      ['data1', 1234],
    ];
  });

  it('converts rows to CSV', () => {
    expect(rowsToCSV(this.data)).toEqual('header1,header2\ndata1,1234');
  });
});

describe('csvRowsToJSON', () => {
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
