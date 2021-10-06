'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const fixture = require('./helpers/fixture-path');
const FastBoot = require('./../src/index');

describe('FastBoot', function() {
  it('throws an exception if no distPath is provided', function() {
    var fn = function() {
      return new FastBoot();
    };

    expect(fn).to.throw(/You must instantiate FastBoot with a distPath option/);
  });

  it('throws an exception if no package.json exists in the provided distPath', function() {
    var distPath = fixture('no-package-json');
    var fn = function() {
      return new FastBoot({
        distPath: distPath,
      });
    };

    expect(fn).to.throw(/Couldn't find (.+)no-package-json/);
  });

  it('throws an error when manifest schema version is higher than fastboot schema version', function() {
    var distPath = fixture('higher-schema-version');
    var fn = function() {
      return new FastBoot({
        distPath: distPath,
      });
    };

    expect(fn).to.throw(
      /An incompatible version between `ember-cli-fastboot` and `fastboot` was found/
    );
  });

  it("doesn't throw an exception if a package.json is provided", function() {
    var distPath = fixture('empty-package-json');
    var fn = function() {
      return new FastBoot({
        distPath: distPath,
      });
    };

    expect(fn).to.throw(/(.+)package.json was malformed or did not contain a fastboot config/);
  });

  it('can render HTML with array of app files defined in package.json', function() {
    const fastboot = new FastBoot({
      distPath: fixture('multiple-app-files'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/Welcome to Ember/);
      });
  });

  it('outputs html attributes from the fastboot app', function() {
    const fastboot = new FastBoot({
      distPath: fixture('custom-html-attrs'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/<html data-before=1 +class="a b it-works" data-after=2/);
      });
  });

  it('outputs body attributes from the fastboot app', function() {
    const fastboot = new FastBoot({
      distPath: fixture('custom-body-attrs'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(
          /<body data-before=1 +class="no-js default-class it-works" data-after=2/
        );
      });
  });

  it('appends classes correctly even when there are no classes in the original body', function() {
    const fastboot = new FastBoot({
      distPath: fixture('custom-body-attrs-with-no-default-classes'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/<body data-before=1 data-after=2 +class="it-works"/);
      });
  });

  it('appends classes correctly even when there are no classes in the original html', function() {
    const fastboot = new FastBoot({
      distPath: fixture('custom-html-attrs-with-no-default-classes'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/<html data-before=1 data-after=2 +class="it-works"/);
      });
  });

  it('can render HTML when a custom set of sandbox globals is provided', function() {
    const fastboot = new FastBoot({
      distPath: fixture('custom-sandbox'),
      buildSandboxGlobals(globals) {
        return Object.assign({}, globals, {
          foo: 5,
          myVar: 'undefined',
        });
      },
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/foo', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/foo from sandbox: 5/);
      });
  });

  it('rejects the promise if an error occurs', function() {
    const fastboot = new FastBoot({
      distPath: fixture('rejected-promise'),
    });
    const response = {
      getHeaders() {},
    };

    return expect(fastboot.visit('/', { response })).to.be.rejected;
  });

  it('catches the error if an error occurs', function() {
    const fastboot = new FastBoot({
      distPath: fixture('rejected-promise'),
    });
    const response = {
      getHeaders() {},
    };

    fastboot.visit('/', { response }).catch(function(err) {
      return expect(err).to.be.not.null;
    });
  });

  it('renders an empty page if the resilient flag is set', function() {
    const fastboot = new FastBoot({
      distPath: fixture('rejected-promise'),
      resilient: true,
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => {
        expect(r.finalized).to.be.true;
        return r.html();
      })
      .then(html => {
        expect(html).to.match(/<body>/);
      });
  });

  it('returns only one chunk if the resilient flag is set', function() {
    const fastboot = new FastBoot({
      distPath: fixture('rejected-promise'),
      resilient: true,
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.chunks())
      .then(chunks => {
        expect(chunks.length).to.eq(1);
        expect(chunks[0]).to.match(/<body>/);
      });
  });

  it('reads the config from package.json', function() {
    const fastboot = new FastBoot({
      distPath: fixture('config-app'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => expect(html).to.match(/Config foo: bar/));
  });

  it('prefers APP_CONFIG environment variable', function() {
    var config = {
      modulePrefix: 'fastboot-test',
      environment: 'development',
      baseURL: '/',
      locationType: 'auto',
      EmberENV: { FEATURES: {} },
      APP: {
        name: 'fastboot-test',
        version: '0.0.0+3e9fe92d',
        autoboot: false,
        foo: 'baz',
      },
      exportApplicationGlobal: true,
    };

    process.env.APP_CONFIG = JSON.stringify(config);

    const fastboot = new FastBoot({
      distPath: fixture('config-app'),
    });
    const response = {
      getHeaders() {},
    };

    delete process.env.APP_CONFIG;

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => expect(html).to.match(/Config foo: baz/));
  });

  it('handles apps with config defined in app.js', function() {
    const fastboot = new FastBoot({
      distPath: fixture('config-not-in-meta-app'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => expect(html).to.match(/Welcome to Ember/));
  });

  it('reloads the config when package.json changes', async function() {
    var distPath = fixture('config-swap-app');
    var packagePath = path.join(distPath, 'package.json');
    var package1Path = path.join(distPath, 'package-1.json');
    var package2Path = path.join(distPath, 'package-2.json');

    copyPackage(package1Path);

    const fastboot = new FastBoot({
      distPath: distPath,
    });
    const response = {
      getHeaders() {},
    };

    try {
      await fastboot
        .visit('/', { response })
        .then(r => r.html())
        .then(html => expect(html).to.match(/Config foo: bar/))
        .then(() => deletePackage())
        .then(() => copyPackage(package2Path))
        .then(hotReloadApp)
        .then(() => fastboot.visit('/', { response }))
        .then(r => r.html())
        .then(html => expect(html).to.match(/Config foo: boo/));
    } finally {
      deletePackage();
    }

    function hotReloadApp() {
      fastboot.reload({
        distPath: distPath,
      });
    }

    function copyPackage(sourcePackage) {
      fs.symlinkSync(sourcePackage, packagePath);
    }

    function deletePackage() {
      fs.unlinkSync(packagePath);
    }
  });

  it('handles apps boot-time failures by throwing Errors', function() {
    const fastboot = new FastBoot({
      distPath: fixture('boot-time-failing-app'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot.visit('/', { response }).catch(e => expect(e).to.be.an('error'));
  });

  it('can read multiple configs', function() {
    const fastboot = new FastBoot({
      distPath: fixture('app-with-multiple-config'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/App Name: app-with-multiple-configs/);
        expect(html).to.match(/Other Config {"default":"bar"}/);
      });
  });

  it('in app prototype mutations do not leak across visits with buildSandboxPerVisit=true', async function() {
    this.timeout(3000);

    const fastboot = new FastBoot({
      distPath: fixture('app-with-prototype-mutations'),
    });
    const response = {
      getHeaders() {},
    };

    let result = await fastboot.visit('/', {
      response,
      buildSandboxPerVisit: true,
    });
    let analytics = result.analytics;
    let html = await result.html();

    expect(html).to.match(/Items: 1/);
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await fastboot.visit('/', {
      response,
      buildSandboxPerVisit: true,
    });
    analytics = result.analytics;
    html = await result.html();

    expect(html).to.match(/Items: 1/);
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await fastboot.visit('/', {
      response,
      buildSandboxPerVisit: true,
    });
    analytics = result.analytics;
    html = await result.html();

    expect(html).to.match(/Items: 1/);
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });
  });

  it('errors can be properly attributed with buildSandboxPerVisit=true', async function() {
    this.timeout(3000);

    const fastboot = new FastBoot({
      distPath: fixture('onerror-per-visit'),
    });

    let first = fastboot.visit('/slow/100/reject', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/100/reject', headers: {} },
      response: { getHeaders() {} },
    });

    let second = fastboot.visit('/slow/50/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/50/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let third = fastboot.visit('/slow/25/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/25/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    await Promise.all([second, third]);

    await first.then(
      () => {
        throw new Error('Visit should not resolve!');
      },
      error => {
        expect(error.code).to.equal('from-slow');
        expect(error.fastbootRequestPath).to.equal('/slow/100/reject');
      }
    );
  });

  it('it eagerly builds sandbox when queue is empty', async function() {
    this.timeout(3000);

    const fastboot = new FastBoot({
      distPath: fixture('onerror-per-visit'),
      maxSandboxQueueSize: 2,
    });

    let first = fastboot.visit('/slow/50/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/50/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let second = fastboot.visit('/slow/50/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/50/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let third = fastboot.visit('/slow/25/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/25/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let result = await first;
    let analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await second;
    analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await third;
    analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: false,
    });
  });

  it('it leverages sandbox from queue when present', async function() {
    this.timeout(3000);

    const fastboot = new FastBoot({
      distPath: fixture('onerror-per-visit'),
      maxSandboxQueueSize: 3,
    });

    let first = fastboot.visit('/slow/50/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/50/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let second = fastboot.visit('/slow/50/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/50/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let third = fastboot.visit('/slow/25/resolve', {
      buildSandboxPerVisit: true,
      request: { url: '/slow/25/resolve', headers: {} },
      response: { getHeaders() {} },
    });

    let result = await first;
    let analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await second;
    analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });

    result = await third;
    analytics = result.analytics;
    expect(analytics).to.be.deep.equals({
      usedPrebuiltSandbox: true,
    });
  });

  it('htmlEntrypoint works', function() {
    const fastboot = new FastBoot({
      distPath: fixture('html-entrypoint'),
    });
    const response = {
      getHeaders() {},
    };

    return fastboot
      .visit('/', { response })
      .then(r => r.html())
      .then(html => {
        expect(html).to.match(/Welcome to Ember/);
        expect(html).to.not.match(/fastboot-script/);
      });
  });
});
