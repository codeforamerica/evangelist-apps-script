/*
 *
 * Given a 2d array like [[header1, header2, header3], [value1, value2, value3], ...], returns
 *   { "header1": "value1", etc. }
 *
 * Perfect to receive the output of Utilities.parseCsv()
 */
function csvRowsToJSON(rows) {
  const headers = rows.shift();

  const objectsToReturn = rows.map((row) => {
    const obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });

  return objectsToReturn;
}

module.exports = {
  csvRowsToJSON,
};
