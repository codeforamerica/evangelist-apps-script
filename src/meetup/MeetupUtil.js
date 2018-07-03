/*
Given a header like:
  Link: <https://api.meetup.com/pro/brigade/members?page=200&offset=1>; rel="next"
this will return:
  { url: "https://api.meetup.com/pro/brigade/members?page=200&offset=1", rel: "next" }
*/
const LINK_REGEXP = new RegExp('<([^>]+)>; rel="([a-zA-Z]+)"');
function meetupParseLinkHeader(header) {
  const match = LINK_REGEXP.exec(header);
  const url = match ? match[1] : null;
  const rel = match ? match[2] : null;

  return {
    header,
    url,
    rel,
  };
}

// converts a time like 1520367649000 to "2018-3-6 20:20:49"
function convertMeetupTime(datetime) {
  const d = new Date(datetime);
  return `${[d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()].join('-')
  } ${[d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].join(':')}`;
}

module.exports = {
  meetupParseLinkHeader,
  convertMeetupTime,
};
