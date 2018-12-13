class MeetupResponse {
  constructor({
    client, responseText, links, recommendedSleepMs,
  }) {
    this.client = client;
    this.responseText = responseText;
    this.links = links;
    this.recommendedSleepMs = recommendedSleepMs;
  }

  body() {
    return JSON.parse(this.responseText);
  }

  hasNextPage() {
    return !!this.links.next;
  }

  requestNextPage() {
    if (this.recommendedSleepMs > 0) {
      console.info(`Throttling for ${this.recommendedSleepMs} ms before next request.`);
      Utilities.sleep(this.recommendedSleepMs);
    }

    return this.client.meetupRequest(this.links.next);
  }

  fetchAllPages() {
    const results = [];

    do {
      if (!Array.isArray(this.body())) {
        throw new Error('fetchAllPages got a response that is not an array!');
      }

      results.push(...this.body());
    } while (this.hasNextPage());

    return results;
  }
}

module.exports = MeetupResponse;
