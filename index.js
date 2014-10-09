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
      'modulesPath': require('path').resolve() + '/modules/',
      'appRootDir': require('path').resolve() + '/server/',
    });

    if (! fs.existsSync(options.modulesPath)) {
      return;
    };

    modelList.push(boot.ConfigLoader.loadModels(__dirname, app.get('env')));

    fs.readdirSync(options.modulesPath).forEach(function (element) {
      // Load models
      modelList.push(boot.ConfigLoader.loadModels(options.modulesPath + element, app.get('env')));

      // Load modules
      if (fs.existsSync(options.modulesPath + '/' + element + '/module.js')) {
        app.module['module'][element] = require(options.modulesPath + element + '/module.js')(app);
      }
    });

    options.models = merge.apply(null, modelList);
  },
  getBootOptions: function () {
    return options;
  }
};

module.exports = looptimeModule;
