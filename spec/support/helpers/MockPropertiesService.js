/*
 * A PropertiesService that will be cleared after every test.
 *
 * Usage:
 *
 * beforeEach(() => {
 *   PropertiesService.mockScriptProperty('name', 'value');
 * });
 */
class MockProperties {
  constructor(properties) {
    this.properties = properties;
  }

  getProperty(name) {
    return this.properties[name];
  }
}

class MockPropertiesService {
  constructor() {
    this.scriptProperties = {};
    this.userProperties = {};
  }

  getScriptProperties() {
    return new MockProperties(this.scriptProperties);
  }

  mockScriptProperty(name, value) {
    this.scriptProperties[name] = value;
  }

  clear() {
    this.scriptProperties = {};
    this.userProperties = {};
  }
}

const mock = new MockPropertiesService();
afterEach(() => mock.clear());
global.PropertiesService = mock;
