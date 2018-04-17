// Adapted from Trello's full-name-splitter library
// see license here: https://github.com/trello/full-name-splitter/blob/bfb2286ebb60996e87b8d236b775e356c69b378e/LICENSE
var _fullNameSplitter = (function() {
  'use strict';

  var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

  function fullNameSplitter(fullName) {
    var token = void 0;
    var tokens = tokenizeFullName(fullName);
    var firstNames = [];
    var lastNames = [];

    while (token = tokens.shift()) {
      if (isLastNamePrefix(token) || hasApostrophe(token) || firstNames.length && tokens.length === 0 && !isInitial(token)) {
        lastNames.push(token);
        break;
      } else {
        firstNames.push(token);
      }
    }
    lastNames = lastNames.concat(tokens);

    if (isSalutation(firstNames[0])) {
      firstNames.shift();
    }

    var _adjust_exceptions = adjust_exceptions(firstNames, lastNames);

    var _adjust_exceptions2 = _slicedToArray(_adjust_exceptions, 2);

    firstNames = _adjust_exceptions2[0];
    lastNames = _adjust_exceptions2[1];


    return [firstNames.join(' ') || null, lastNames.join(' ') || null];
  };

  var LAST_NAME_PREFIXES = ['de', 'da', 'la', 'du', 'del', 'dei', 'vda.', 'dello', 'della', 'degli', 'delle', 'van', 'von', 'der', 'den', 'heer', 'ten', 'ter', 'vande', 'vanden', 'vander', 'voor', 'ver', 'aan', 'mc'];

  var SUFFIX_REGEX = /,? +(i{1,3}|iv|vi{0,3}|s(enio)?r|j(unio)?r|phd|apr|rph|pe|md|ma|dmd|cme)$/i;

  var SALUTATION_REGEX = /^(mrs?|m[ia]ster|miss|ms|d(octo)?r|prof|rev|fr|judge|honorable|hon|lord|lady)\.?$/i;

  var isLastNamePrefix = function isLastNamePrefix(token) {
    return LAST_NAME_PREFIXES.indexOf(token.toLowerCase()) != -1;
  };

  var isSalutation = function isSalutation(token) {
    return token && token.match(SALUTATION_REGEX);
  };

  // M or W.
  var isInitial = function isInitial(token) {
    return token.match(/^\w\.?$/);
  };

  // O'Connor, d'Artagnan match
  // Noda' doesn't match
  var hasApostrophe = function hasApostrophe(token) {
    return token.match(/\w{1}'\w+/);
  };

  var adjust_exceptions = function adjust_exceptions(firstNames, lastNames) {
    // Adjusting exceptions like
    // "Ludwig Mies van der Rohe"      => ["Ludwig", "Mies van der Rohe"]
    // "Juan Martín de la Cruz Gómez"  => ["Juan Martín", "de la Cruz Gómez"]
    // "Javier Reyes de la Barrera"    => ["Javier", "Reyes de la Barrera"]
    // "Rosa María Pérez Martínez Vda. de la Cruz"
    //   => ["Rosa María", "Pérez Martínez Vda. de la Cruz"]
    if (firstNames.length > 1 && !isInitial(firstNames[firstNames.length - 1]) && lastNames.join(' ').match(/^(van der|(vda\. )?de la \w+$)/i)) {
      while (1) {
        lastNames.unshift(firstNames.pop());
        if (firstNames.length <= 2) break;
      }
    }

    return [firstNames, lastNames];
  };

  var tokenizeFullName = function tokenizeFullName(fullName) {
    fullName = fullName.trim().replace(/\s+/g, ' ').replace(SUFFIX_REGEX, '');

    if (fullName.indexOf(',') != -1) {
      return fullName
      // ",van helsing" produces  ["", "van helsing"]
      .split(/\s*,\s*/, 2)
      // but it should be [null, "van helsing"] by lib convention
      .map(function (u) {
        return u || null;
      }).reverse();
    } else {
      return fullName.split(/\s+/);
    }
  };

  return fullNameSplitter;
})();