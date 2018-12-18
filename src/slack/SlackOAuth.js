function slackAppAuthCallback(request) {
  var slackService = getSlackAppService('cfa');
  var isAuthorized = slackService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}

/*
for example if more scopes are added.
*/
function slackUnauthorize() {
  var service = getSlackAppService('cfa')
  service.reset();
}

function showSlackSidebar() {
  var slackService = getSlackAppService('cfa');
  
  if (!slackService.hasAccess()) {
    var authorizationUrl = slackService.getAuthorizationUrl();
    Logger.log(authorizationUrl);
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Reopen the sidebar when the authorization is complete.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    SpreadsheetApp.getUi().showSidebar(page);
  } else {
    Logger.log('access granted!');
    // ...
  }
}

function getSlackAppService(workspaceSubdomain) {
  var slackClientId = PropertiesService.getScriptProperties().getProperty('SLACK_CLIENT_ID');
  var slackClientSecret = PropertiesService.getScriptProperties().getProperty('SLACK_CLIENT_SECRET');
  
  if (!slackClientId || !slackClientSecret) {
    throw new Error("Ensure SLACK_CLIENT_ID and SLACK_CLIENT_SECRET Script Properties are set!");
  }
  
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.
  return OAuth2.createService('slack-' + workspaceSubdomain)
      // Set the endpoint URLs, which are the same for all Google services.
      .setAuthorizationBaseUrl('https://slack.com/oauth/authorize')
      .setTokenUrl('https://slack.com/api/oauth.access')

      // Set the client ID and secret, from the Google Developers Console.
      .setClientId(slackClientId)
      .setClientSecret(slackClientSecret)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('slackAppAuthCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request (space-separated).
      .setScope('channels:read channels:history users:read users:read.email')

      // Below are Google-specific OAuth2 parameters.

      // Sets the login hint, which will prevent the account chooser screen
      // from being shown to users logged in with multiple accounts.
      // .setParam('login_hint', Session.getActiveUser().getEmail())

      // Requests offline access.
      // .setParam('access_type', 'offline')

      // Forces the approval prompt every time. This is useful for testing,
      // but not desirable in a production application.
      // .setParam('approval_prompt', 'force');
}

function slackHasAccess(subdomainOrArray) {
  if (Array.isArray(subdomainOrArray)) {
    var returnValues = [];
    for (var i = 0; i < subdomainOrArray.length; i++) {
      var subdomain = subdomainOrArray[i][0];
      
      if (subdomain) {
        var slackService = getSlackAppService(subdomain);
        returnValues.push(slackService.hasAccess())
      }  
    }
    
    return returnValues;
  } else {
    var slackService = getSlackAppService(subdomainOrArray);
    return slackService.hasAccess()
  }
}

function makeSlackRequest(uri, workspaceSubdomain) {
  var slackService = getSlackAppService(workspaceSubdomain);
  if (!slackService.hasAccess()) {
    throw new Error("Need to grant access to workspace: " + workspaceSubdomain);
  }

  console.log("Slack API Request: " + uri);
  var response = UrlFetchApp.fetch(uri, {
    headers: {
      Authorization: 'Bearer ' + slackService.getAccessToken()
    }
  });
  if (response.getResponseCode() >= 300) {
    throw new Error('Got non-200 code: ' + response.getResponseCode() + '. Body: ' + response.getContentText());
  }

  var body = JSON.parse(response.getContentText());
  if (body.ok !== true) {
    throw new Error('Slack returned error: ' + body.error);
  }
  if (body.warning) {
    console.warn('Slack warning: ', body.warning)
  }

  console.log('Got Slack successful response.');
  return body;  
}

function makeSlackPaginatedRequest(uri, workspaceSubdomain, responseKey) {
  var objectsToReturn = [];
  var cursorParams = 'limit=100';
  var hasNextPage;
  
  do {
    var response = makeSlackRequest(uri + (uri.indexOf('?') === -1 ? '?' : '&') + cursorParams, workspaceSubdomain);
    for (var i = 0; i < response[responseKey].length; i++) {
      objectsToReturn.push(response[responseKey][i]); // todo: use a oneliner for this
    }
    
    if (response.response_metadata && response.response_metadata.next_cursor) {
      cursorParams = 'limit=100&cursor=' + encodeURIComponent(response.response_metadata.next_cursor);
      hasNextPage = true;
    } else {
      hasNextPage = false;
    }
  } while (hasNextPage);
  
  return objectsToReturn;
}

function slackChannelsImport() {
  var channels = makeSlackPaginatedRequest(
    'https://slack.com/api/conversations.list?exclude_members=true&exclude_archived=true', 'cfa', 'channels');
  
  var channelsToAdd = [
    ['ID', 'Name', 'Number of Members', 'Channel?', 'Archived?', 'Active (last 3 Months)?']
  ];
  for (var i = 0; i < channels.length; i++) {
    channelsToAdd.push(
      [
        channels[i].id,
        channels[i].name_normalized,
        channels[i].num_members,
        channels[i].is_channel,
        channels[i].is_archived,
        slackHasPostInLastThreeMonths(channels[i].id)
      ]
    )
  }
  
  SpreadsheetApp.getActive().getSheetByName("WIP Slack Channels").clear()
  .getRange(1, 1, channelsToAdd.length, channelsToAdd[0].length).setValues(channelsToAdd);
}

function slackUsersImport() {
  var users = makeSlackPaginatedRequest(
    'https://slack.com/api/users.list', 'cfa', 'members');
  
  var usersToAdd = [
    ['ID', 'Display Name', 'Real Name', 'Email', 'Time Zone', 'Deleted?']
  ];
  for (var i = 0; i < users.length; i++) {
    usersToAdd.push(
      [
        users[i].id,
        users[i].profile.display_name,
        users[i].profile.real_name,
        users[i].profile.email,
        users[i].tz,
        users[i].deleted
      ]
    )
  }
  
  SpreadsheetApp.getActive().getSheetByName("WIP Slack Users").clear()
  .getRange(1, 1, usersToAdd.length, usersToAdd[0].length).setValues(usersToAdd);

}

function slackHasPostInLastThreeMonths(channelId) {
  var threeMonthsAgo = (new Date() - 3 * 30 * 24 * 60 * 60 * 1000) / 1000;
  var foundMessage = false, hasMorePages, cursor = 'oldest=' + threeMonthsAgo;
 
  do {
    var response = makeSlackRequest('https://slack.com/api/conversations.history?channel=' + channelId + '&limit=100&' + cursor, 'cfa');

    var message = response.messages.filter(function(i) { return i.subtype !== 'channel_join' });
    foundMessage = message.length > 0;
    
    if (response.response_metadata && response.response_metadata.next_cursor) {
      hasMorePages = true;
      cursor = response.response_metadata.next_cursor;
    } else {
      hasMorePages = false;
    }
  } while (!foundMessage && hasMorePages);
  
  return foundMessage;
}
