const {
  convertMeetupTime,
  meetupParseLinkHeader,
} = require('../../src/meetup/MeetupUtil');

describe('meetupParseLinkHeader', function() {
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

describe('convertMeetupTime', function() {
  it('converts to the proper date and time', () => {
    this.subject = 1520367649000;

    expect(convertMeetupTime(this.subject))
      .toEqual('2018-3-6 20:20:49');
  });
});
