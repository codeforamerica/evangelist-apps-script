const { BrigadeDirectory, Brigade, BrigadeList } = require('../src/BrigadeDirectory');

const VALID_BRIGADE_OPTIONS = {
  name: 'Open Oakland',
  isActive: true, // isActive
  city: 'San Francisco', // city
  state: 'CA', // state
  primaryContactName: 'John Doe',
  primaryContactEmail: 'john@doe.com',
  publicContactEmail: 'leaders@openoakland.org',
  website: 'www.openoakland.org',
  twitter: '@openoakland',
  facebookPageUrl: 'fb.com/openoak',
  githubUrl: 'github.com/OpenOakland',
  meetupUrl: 'meetup.com/OpenOakland',
  salesforceAccountId: '001d0000023Fp6QAAS',
};
const INACTIVE_BRIGADE_OPTIONS = Object.assign(
  {},
  VALID_BRIGADE_OPTIONS,
  { name: 'Code for Inactive', isActive: false },
);

describe('BrigadeDirectory', () => {
  beforeEach(() => {
    this.activeBrigade = Brigade.fromObject(VALID_BRIGADE_OPTIONS);
    this.inactiveBrigade = Brigade.fromObject(INACTIVE_BRIGADE_OPTIONS);

    this.brigadeList = new BrigadeList([
      this.activeBrigade,
      this.inactiveBrigade,
    ]);
    this.isInternal = false;

    this.subject = () => new BrigadeDirectory(this.brigadeList, this.isInternal);
  });

  describe('.headers', () => {
    it('uses Public Contact Email', () => {
      expect(Object.keys(this.subject().headers())).toContain('Public Contact Email');
    });

    describe('for isInternal', () => {
      beforeEach(() => {
        this.isInternal = true;
      });

      it('uses Primary Contact Email', () => {
        expect(Object.keys(this.subject().headers())).toContain('Primary Contact Email');
      });
    });
  });

  describe('.brigadesToAdd', () => {
    beforeEach(() => {
      this.headers = Object.keys(this.subject().headers());
      this.getField = (field, b) => b[this.headers.indexOf(field)];
    });

    it('excludes inactive brigades', () => {
      const brigadeNames =
        this.subject().brigadesToAdd().map(b => this.getField('Brigade Name', b));

      expect(brigadeNames).toContain(VALID_BRIGADE_OPTIONS.name);
      expect(brigadeNames).not.toContain(INACTIVE_BRIGADE_OPTIONS.name);
    });

    it('converts brigade objects to the headers', () => {
      const activeBrigade = this.subject().brigadesToAdd()[0];

      expect(this.getField('City', activeBrigade)).toEqual(VALID_BRIGADE_OPTIONS.city);
      expect(this.getField('Public Contact Email', activeBrigade)).toEqual(VALID_BRIGADE_OPTIONS.publicContactEmail);
      expect(this.getField('Salesforce Account ID', activeBrigade)).toEqual(VALID_BRIGADE_OPTIONS.salesforceAccountId);
    });
  });
});
