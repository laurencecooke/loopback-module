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
      } else {
        return;
      }

      // Load errors
      if (fs.existsSync(options.modulesPath + '/' + element + '/errors/data.json')) {
        app.module[element].errors = require(options.modulesPath + '/' + element + '/errors/data.json');
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
    if (! data) {
      console.log("Fixture resolution should have data", data, id)

      process.exit(1)
    }

    fixtureList[id] = data;

    this.app.emit('fixture.loaded', id);

    this.app.log('fixture.loaded').debug({id: id, data: data});
  },
  onFixtureLoaded: function (id) {
    var self = this;

    return new Promise(function (resolve) {
      self.app.log('fixture.onLoaded').debug({id: id});

      if (fixtureList[id]) {
        self.app.log('fixture.onLoaded.resolved.memory').debug({id: id});

        return resolve(fixtureList[id]);
      }

      self.app.on('fixture.loaded', function (fixtureId) {
        if (id == fixtureId) {
          self.app.log('fixture.onLoaded.resolved.event').debug({id: id});

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
  resetAndLoadFixtures: function (app, dataSources) {
    var resetModulesArray = [];
    fixtureList = [];

    if (! dataSources) {
      dataSources = ['db'];
    }

    this.app.removeAllListeners();

    var self = this;

    return new Promise(function (resolve, reject) {
      self.app.dataSources[dataSources[0]].automigrate(function () {
        for (module in app.module) {
          if (app.module[module].resetAndLoadFixtures) {
            self.app.log('fixture.loading').debug({id: module});

            resetModulesArray.push(app.module[module].resetAndLoadFixtures());
          }
        }

        Promise.all(resetModulesArray)
          .then (function (done) {
            console.log('Database reloaded');

            resolve(true);
          })
          .catch(reject);
      })
    })
  },
  getBootOptions: function () {
    return options;
  }
};

module.exports = loopbackModule;
