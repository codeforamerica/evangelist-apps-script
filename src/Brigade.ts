class Brigade {
  name: string;
  isActive: boolean;
  city: string;
  state: string;
  region: string;
  primaryContactName: string;
  primaryContactEmail: string;
  publicContactEmail: string;
  website: string;
  twitter: string;
  facebookPageUrl: string;
  githubUrl: string;
  meetupUrl: string;
  salesforceAccountId: string;

  constructor(
    name, isActive, city, state, region, primaryContactName, primaryContactEmail,
    publicContactEmail, website, twitter, facebookPageUrl, githubUrl,
    meetupUrl, salesforceAccountId,
  ) {
    this.name = name;
    this.isActive = isActive;
    this.city = city;
    this.state = state;
    this.region = region;
    this.primaryContactName = primaryContactName;
    this.primaryContactEmail = primaryContactEmail;
    this.publicContactEmail = publicContactEmail;
    this.website = website;
    this.twitter = twitter;
    this.facebookPageUrl = facebookPageUrl;
    this.githubUrl = githubUrl;
    this.meetupUrl = meetupUrl;
    this.salesforceAccountId = salesforceAccountId;
  }

  static fromObject(object) {
    const {
      name, isActive, city, state, region, primaryContactName, primaryContactEmail,
      publicContactEmail, website, twitter, facebookPageUrl, githubUrl,
      meetupUrl, salesforceAccountId,
    } = object;

    return new Brigade(
      name, isActive, city, state, region, primaryContactName, primaryContactEmail,
      publicContactEmail, website, twitter, facebookPageUrl, githubUrl,
      meetupUrl, salesforceAccountId,
    );
  }
}

class BrigadeList {
  brigades: Array<Brigade>;

  constructor(brigades) {
    this.brigades = brigades;
  }

  /*
   * @param {Array} salesforceSheet A 2-dimensional array that represents the
   *   "AUTO:salesforce" sheet's contents.
   */
  static fromSalesforceSheet(salesforceSheet) {
    const [salesforceHeaders, ...salesforceContents] = salesforceSheet;

    return new BrigadeList(salesforceContents.map(row => new Brigade(
      row[salesforceHeaders.indexOf('Brigade Name')],
      row[salesforceHeaders.indexOf('Active?')],
      row[salesforceHeaders.indexOf('Location')].split(', ')[0], // city
      row[salesforceHeaders.indexOf('Location')].split(', ')[1], // state
      row[salesforceHeaders.indexOf('Region')],
      row[salesforceHeaders.indexOf('Primary Contact')],
      row[salesforceHeaders.indexOf('Primary Contact Email')],
      row[salesforceHeaders.indexOf('Public Contact Email')],
      row[salesforceHeaders.indexOf('Website')],
      row[salesforceHeaders.indexOf('Twitter')],
      row[salesforceHeaders.indexOf('Facebook Page URL')],
      row[salesforceHeaders.indexOf('GitHub URL')],
      row[salesforceHeaders.indexOf('Meetup URL')],
      row[salesforceHeaders.indexOf('Salesforce Account ID')],
    )));
  }
}


export { Brigade, BrigadeList };
