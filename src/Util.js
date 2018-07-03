/*
 * Convert a date object into ISO8601
 * @param date {Date}
 * @return {String} e.g. "2018-06-28T22:07:03Z"
 */
function dateToISO8601(date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  return (
    `${date.getUTCFullYear()}-` + // eslint-disable-line prefer-template
    (month < 10 ? '0' : '') + `${month}-` +
    (day < 10 ? '0' : '') + `${day}T` +
    (hour < 10 ? '0' : '') + `${hour}:` +
    (minute < 10 ? '0' : '') + `${minute}:` +
    (second < 10 ? '0' : '') + `${second}Z`
  );
}

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

/*
 * Simple CSV generator.
 */
function rowsToCSV(rows) {
  const toString = (el) => {
    // format dates
    if (el instanceof Date) {
      return dateToISO8601(el);
    } else if (typeof el === 'string') {
      let escaped = el;
      let surroundInQuotes = false;

      // surround in quotes if data contains a comma or newline
      if (escaped.indexOf(',') !== -1 || escaped.indexOf('\n') !== -1) {
        surroundInQuotes = true;
      }

      // escape " -> ""
      if (escaped.indexOf('"') !== -1) {
        surroundInQuotes = true;
        escaped = escaped.replace(/"/g, '""');
      }

      if (surroundInQuotes) {
        escaped = `"${escaped}"`;
      }

      return escaped;
    }

    return el.toString();
  };

  return rows.map(row => row.map(toString).join(',')).join('\n');
}

module.exports = {
  dateToISO8601,
  rowsToCSV,
  csvRowsToJSON,
};
