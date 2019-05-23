class Brigade {
  name: string;
  isActive: boolean;
  city: string | void;
  state: string;
  region: string | void;
  primaryContactName: string | void;
  primaryContactEmail: string | void;
  publicContactEmail: string | void;
  website: string;
  twitter: string;
  facebookPageUrl: string;
  githubUrl: string;
  meetupUrl: string;
  salesforceAccountId: string | void;

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

interface BrigadeInformationJSONEntry {
  name: string;
  website: string;
  city: string;
  tags: Array<string>;
  social_profiles?: {
    twitter: string;
    facebook: string;
  };
  latitude?: string;
  longitude?: string;
  events_url?: string;
  projects_list_url?: string;
  rss?: string;
};

class BrigadeList {
  brigades: Array<Brigade>;

  constructor(brigades: Array<Brigade>) {
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

  static fromBrigadeInformationJSON(json) {
    return new BrigadeList(json.map((brigade: BrigadeInformationJSONEntry) => Brigade.fromObject({
      name: brigade.name,
      website: brigade.website,
      city: brigade.city.includes(',') ? brigade.city.split(', ')[0] : null,
      state: brigade.city.includes(', ') ? brigade.city.split(', ')[1] : brigade.city,
      twitter: brigade.social_profiles && brigade.social_profiles.twitter,
      facebookPageUrl: brigade.social_profiles && brigade.social_profiles.facebook,
      meetupUrl: brigade.events_url,
      isActive: brigade.tags.indexOf('Code for America') !== -1 &&
        brigade.tags.indexOf('Brigade') !== -1 &&
        brigade.tags.indexOf('Official') !== -1,
    })));
  }
}


export { Brigade, BrigadeList };
