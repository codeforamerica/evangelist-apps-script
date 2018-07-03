const { meetupParseLinkHeader } = require('./MeetupUtil');
const MeetupResponse = require('./MeetupResponse');

class MeetupClient {
  constructor(apiKey = PropertiesService.getScriptProperties().getProperty('MEETUP_API_KEY')) {
    if (!apiKey) {
      throw new Error('No MEETUP_API_KEY defined in Script Properties!');
    }

    this.apiKey = apiKey;
  }

  meetupRequest(url) {
    console.log(`Beginning request for: ${url}`);

    let urlWithKey;
    if (url.indexOf('?') !== -1) {
      urlWithKey = `${url}&key=${this.apiKey}`;
    } else {
      urlWithKey = `${url}?key=${this.apiKey}`;
    }

    let response;
    let success = false;
    let retries = 3;
    while (!success && retries > 0) {
      try {
        response = UrlFetchApp.fetch(urlWithKey);
        success = true;
      } catch (e) {
        if (e.message.match(/Address unavailable/) && response && response.getResponseCode() === 200) {
          console.log(`  Got error: ${e.message} but response was 200. Swallowing exception and continuing.`);
        } else {
          retries -= 1;
          // with 2 retries left, sleep 1 second
          // with 1 retry left, sleep 6 seconds
          // with 0 retries left, sleep 11 seconds
          const delayMs = (1 + (5 * (2 - retries))) * 1000;
          console.log(`  Got error: ${e.message}. Retrying in ${delayMs} ms.`);
          Utilities.sleep(delayMs);
        }
      }
    }

    if (!success) {
      throw new Error('  Error fetching Meetup members. Retried 3 times to no avail.');
    }

    const headers = response.getAllHeaders();
    const links = {};
    const responseBytes = response.getContent().length;
    console.log(`  Got response (Status: ${response.getResponseCode()}; Size: ${responseBytes}b; Ratelimit: ${headers['x-ratelimit-remaining']}/${headers['x-ratelimit-limit']}; Reset in ${headers['x-ratelimit-reset']})`);

    if (typeof headers.Link === 'string') {
      const parsedHeader = meetupParseLinkHeader(headers.Link);
      if (parsedHeader.rel) {
        links[parsedHeader.rel] = parsedHeader.url;
      } else {
        console.eror(`Could not parse link header: ${headers.Link}`);
      }
    } else if (typeof headers.Link === 'object') { // it's actually an array, but arrays are objects
      headers.Link
        .map(meetupParseLinkHeader)
        .forEach((parsedHeader) => {
          if (parsedHeader.rel) {
            links[parsedHeader.rel] = parsedHeader.url;
          } else {
            console.error(`Could not parse link header: ${parsedHeader.header}`);
          }
        });
    }

    let recommendedSleepMs;
    if (parseInt(headers['x-ratelimit-remaining'], 10) >= 10) {
      recommendedSleepMs = 0;
    } else {
      recommendedSleepMs = 1000 * (parseInt(headers['x-ratelimit-remaining'], 10) <= 1 ?
        parseInt(headers['x-ratelimit-reset'], 10) :
        parseFloat(headers['x-ratelimit-reset']) / parseInt(headers['x-ratelimit-limit'], 10));
    }

    return new MeetupResponse({
      client: this,
      responseBody: JSON.parse(response.getContentText()),
      links,
      recommendedSleepMs,
    });
  }
}

module.exports = MeetupClient;
