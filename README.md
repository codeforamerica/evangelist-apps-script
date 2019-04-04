# Evangelist Apps Script

This repo hosts Google Apps Script that's useful to me (@tdooner) in my role as the developer evangelist on the network team.

## Quick Links
* [Live Brigade API Updates](https://docs.google.com/spreadsheets/d/1IM-eKVsCy3a69cWKL_Tdz36sGJCwMxzKYTx4z_jpwAc/edit#gid=1130512200) Google Sheet
* [Apps Script Project](https://script.google.com/a/codeforamerica.org/macros/d/MTuk3LZlBZufNbA6SvZMFGJhG3lFpo0w5/edit?uiv=2&mid=ACjPJvHVu5iq6vj8fIa3gfb6QXZTX9mXq_gY24KG_Pv0V8AACtYkXqz58GpfXxmZHyNXjvw7q9d6MX-Px_bamIjMkG1dqUFrzJYn4E8NGowMakS1T7vmcqTBT50U2kwyr_0c446mLDDUVA)

## Description

Originally, this started off simple, with just a script to sync Salesforce and the [brigade-information repo][binfo]; however, over time, Apps Script has proven itself a reliable-enough language with sufficient API integrations to be able to do so much more.

Currenty, the code in this repo does the following:

* **Salesforce:** Import brigades
  * Identify brigades missing a primary contact
  * Cross-reference primary contact email addresse with `brigadeleads@` mailing list.
* **[brigade-information repo][binfo]**: Import brigades
* **Weekly email**: Send a list of data inconsistencies, including:
  * Brigades missing from Salesforce or the [brigade-information repo][binfo]
  * Primary contact emails that are missing or need to be added to `brigadeleads@` list.
* **Directory:** Populate the public [Brigade Contact Directory](http://c4a.me/brigades) as well as [the internal version](https://docs.google.com/spreadsheets/d/12o5V69MMiYO6sls5V4FLN1_gtgquVlr3mzrncHvQZzI/edit?usp=sharing) that includes the non-public Primary Contact Emails of brigade captains.
* **Meetup Pro:** Import attendee data from our Meetup account

The following features are works in progress:

* **External Sheets**: Sync Meetup attendee data to external spreadsheets for purposes of sharing email addresses with brigades.

## Naming Conventions
The sheets in the Google docs relating to this repo are named according to this
convention:

* *`[AUTO]`* - Created by an automatic script from an external data source. Do not modify (or else the script will overwrite your changes).
* *`[CALC]`* - An intermediate sheet used for internal calculations. Modify the formulas with caution.
* *`[IMPORT]`* - A sheet that's copied for intermediate convenience. For example, importing a copy of the Brigade directory so that another sheet can use conditional validation of brigade names. Do not modify.
* *`[EXPORT]`* - A sheet that's intended to be copied to external documents. Export sheets should include the URLs of any sheets that import them.

## Setup / Instructions:
```bash
# 1. install node and yarn package manager, and typescript (homebrew)
brew install nodenv
nodenv install
npm install -g yarn
# 2. yarn install
# 3. make some changes in the Google App Script IDE
# 4. Pull the changes:
clasp pull
# 5. Commit them here
git commit
```


[binfo]: https://github.com/codeforamerica/brigade-information

## TODO:
* **Test Coverage:** Figure out a way to test these scripts.
