/*
 * Object.assign polyfill from:
 *   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */
if (typeof Object.assign !== 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target, varArgs) { // .length of function is 2
'use strict';

      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      const to = Object(target);

      for (let index = 1; index < arguments.length; index++) {
        const nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (const nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}

/*
 *
 * Given a 2d array like [[header1, header2, header3], [value1, value2, value3], ...], returns
 *   { "header1": "value1", etc. }
 *
 * Perfect to receive the output of Utilities.parseCsv()
 */
function _csvRowsToJSON(rows) {
  const headers = rows.shift();

  const objectsToReturn = [];
  for (const i in rows) {
    const row = rows[i];
    const obj = {};
    for (const j in headers) {
      obj[headers[j]] = row[j];
    }
    objectsToReturn.push(obj);
  }

  return objectsToReturn;
}
