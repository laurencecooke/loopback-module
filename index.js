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

var looptimeModule = {
  init: function (app, boot, configOptions) {
    var modelList = [];

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
  afterBoot: function (app) {
    for (module in app.module) {
      if (app.module[module].afterBoot) {
        app.module[module].afterBoot(options.appRootDir);
      }
    }
  },
  resetAndLoadFixtures: function (app) {
    var resetModulesArray = [];

    for (module in app.module) {
      if (app.module[module].resetAndLoadFixtures) {
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

module.exports = looptimeModule;
