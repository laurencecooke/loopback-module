'use strict';

/**
 * Looptime module
 *
 * Add support of modules to loopback application
 *
 * @year 2014
 * @author Alex Strutsynskyi cajoy.dev@gmail.com
 */
var fs        = require('fs');
var _defaults = require('lodash.defaults');
var merge     = require('recursive-merge');

var options = {};
var fixtureList = {};

var loopbackModule = {
  init: function (app, boot, configOptions) {
    var modelList = [];

    this.app = app;

    app.module = {};

    options = _defaults({}, configOptions, {
      'modulesPath': __dirname  + '/../../modules/',
      'appRootDir': __dirname  + '/../../server/',
      'npmModuleList': []
    });

    if (! fs.existsSync(options.modulesPath)) {
      return;
    };

    modelList.push(boot.ConfigLoader.loadModels(options.appRootDir, app.get('env')));

    fs.readdirSync(options.modulesPath).forEach(function (element) {
      // Load models
      modelList.push(boot.ConfigLoader.loadModels(options.modulesPath + element, app.get('env')));

      // Load modules
      if (fs.existsSync(options.modulesPath + '/' + element + '/index.js')) {
        app.module[element] = require(options.modulesPath + element + '/index.js')(app);
      }
    });

    options.npmModuleList.forEach(function (element) {
      app.module[element] = require(element)(app);

      var modelsConfig = require(app.module[element].getPath() + '/model-config.json');

      modelsConfig._meta = {
        sources: [
          app.module[element].getPath() + '/models/'
        ]
      }

      modelList.push(modelsConfig);
    })

    options.models = merge.apply(null, modelList);
  },
  fixtureLoaded: function (id, data) {
    fixtureList[id] = data;

    this.app.log('fixture.loaded').debug({id: id, data: data});

    this.app.emit('fixture.loaded', id);
  },
  onFixtureLoaded: function (id) {
    var self = this;

    if (fixtureList[id]) {
      return Promise.resolve(fixtureList[id]);
    }

    return new Promise(function (resolve) {
      self.app.log('fixture.onLoaded').debug({id: id});

      self.app.on('fixture.loaded', function (fixtureId) {
        if (id == fixtureId) {
          self.app.log('fixture.onLoaded.resolved').debug({id: id});

          resolve (fixtureList[id]);
        }
      });
    })
  },
  afterBoot: function (app) {
    for (module in app.module) {
      if (app.module[module].afterBoot) {
        app.module[module].afterBoot(options.appRootDir);
      }
    }
  },
  resetAndLoadFixtures: function (app) {
    var resetModulesArray = [];
    fixtureList = [];

    for (module in app.module) {
      if (app.module[module].resetAndLoadFixtures) {
        this.app.log('fixture.loading').debug({id: module});

        resetModulesArray.push(app.module[module].resetAndLoadFixtures());
      }
    }

    return Promise.all(resetModulesArray)
      .then (function (done) {
        console.log('Database reloaded');

        return Promise.resolve(true);
      })
      .catch (function (err) {
        return Promise.reject(err);
      })
  },
  getBootOptions: function () {
    return options;
  }
};

module.exports = loopbackModule;
