const {
  convertMeetupTime,
  meetupParseLinkHeader,
} = require('../../src/meetup/MeetupUtil');
const MeetupClient = require('../../src/meetup/MeetupClient');

global.UrlFetchApp = {
  fetch(url) {},
};
global.Utilities = {
  // eslint-disable-next-line no-unused-vars
  sleep(ms) {}, // do nothing
};

const mockMeetupResponse = (status = 200, headers = {}, body = '{}') => ({
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
    });

    describe('with a paginated response', () => {
      this.meetupResponses = [
      ];
      beforeEach(() => {
        const responseWithLink = mockMeetupResponse(
          200,
          { Link: '<https://api.meetup.com/pro/brigade/members?page=200&offset=1>; rel="next"' },
          '{}',
        );

        spyOn(UrlFetchApp, 'fetch').and.returnValue(responseWithLink);
      });

      it('returns a response object with hasNextPage = true', () => {
        const client = new MeetupClient();
        const response = client.meetupRequest('/foo/bar');
        expect(response.hasNextPage()).toEqual(true);
      });
    });
  });
});

describe('meetupParseLinkHeader', () => {
  it('parses a link header', () => {
    this.subject = 'Link: <https://api.meetup.com/pro/brigade/members?page=200&offset=1>; rel="next"';

    expect(meetupParseLinkHeader(this.subject))
      .toEqual({
        header: this.subject,
        url: 'https://api.meetup.com/pro/brigade/members?page=200&offset=1',
        rel: 'next',
      });
  });
});

describe('convertMeetupTime', () => {
  it('converts to the proper date and time', () => {
    this.subject = 1520367649000;

    expect(convertMeetupTime(this.subject))
      .toEqual('2018-3-6 20:20:49');
  });
});
