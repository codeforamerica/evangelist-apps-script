const MeetupClient = require('../../src/meetup/MeetupClient');

global.UrlFetchApp = {
  fetch(url) {}, // eslint-disable-line no-unused-vars
};
global.Utilities = {
  // eslint-disable-next-line no-unused-vars
  sleep(ms) {}, // do nothing
};

const mockMeetupResponse = (status = 200, headers = {}, body = '{"success": true}') => ({
  getResponseCode() { return status; },
  getAllHeaders() { return headers; },
  getContent() { return body; },
  getContentText() { return body; },
});

describe('MeetupClient', () => {
  beforeEach(() => {
    spyOn(console, 'log');
  });

  beforeEach(() => {
    this.apiKey = 'some-value';
    PropertiesService.mockScriptProperty('MEETUP_API_KEY', this.apiKey);
  });

  describe('meetupRequest', () => {
    describe('with a successful response', () => {
      beforeEach(() => {
        spyOn(UrlFetchApp, 'fetch').and.returnValue(mockMeetupResponse());
      });

      it('makes a request to the right URL', () => {
        const client = new MeetupClient();
        client.meetupRequest('/foo/bar');
        expect(UrlFetchApp.fetch.calls.mostRecent().args)
          .toEqual([`/foo/bar?key=${this.apiKey}`]);
      });

      it('does not have next page', () => {
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.hasNextPage()).toEqual(false);
      });

      it('returns a response object with the responseText and body', () => {
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(JSON.parse(response.responseText)).toEqual({ success: true });
        expect(response.body()).toEqual({ success: true });
      });
    });

    describe('with a response with a rate limit', () => {
      it('does not recommend sleeping until remaining < 10', () => {
        spyOn(UrlFetchApp, 'fetch').and.returnValue(mockMeetupResponse(200, {
          'x-ratelimit-remaining': 11,
          'x-ratelimit-reset': 10,
          'x-ratelimit-limit': 30,
        }));

        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.recommendedSleepMs).toEqual(0);
      });

      it('calculates recommendedSleepMs properly', () => {
        spyOn(UrlFetchApp, 'fetch').and.returnValue(mockMeetupResponse(200, {
          'x-ratelimit-remaining': 2,
          'x-ratelimit-reset': 10,
          'x-ratelimit-limit': 30,
        }));

        // when two requests remain, sleep for 10 / 2 = 5 seconds
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.recommendedSleepMs).toEqual(5000);
      });

      it('recommends sleeping for the whole time when one request remains', () => {
        spyOn(UrlFetchApp, 'fetch').and.returnValue(mockMeetupResponse(200, {
          'x-ratelimit-remaining': 1,
          'x-ratelimit-reset': 10,
          'x-ratelimit-limit': 30,
        }));

        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.recommendedSleepMs).toEqual(10000);
      });
    });

    describe('with a paginated response', () => {
      beforeEach(() => {
        this.linkUrl = 'https://api.meetup.com/pro/brigade/members?page=200&offset=1';

        const responseWithLink =
          mockMeetupResponse(200, { Link: `<${this.linkUrl}>; rel="next"` }, '{}');

        spyOn(UrlFetchApp, 'fetch').and.returnValue(responseWithLink);
      });

      it('returns a response object with links defined', () => {
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.links.next).toEqual(this.linkUrl);
      });

      it('returns a response object with hasNextPage = true', () => {
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.hasNextPage()).toEqual(true);
      });
    });
  });
});

