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

    options = _defaults({}, configOptions, {
      'modulesPath': __dirname  + '/../../modules/',
      'appRootDir': __dirname  + '/../../server/',
    });

    modelList.push(boot.ConfigLoader.loadModels(__dirname, app.get('env')));

    fs.readdirSync(options.modulesPath).forEach(function (element) {
      modelList.push(boot.ConfigLoader.loadModels(options.modulesPath + element, app.get('env')));
    });

    options.models = merge.apply(null, modelList);
  },
  getBootOptions: function () {
    return options;
  }
};

module.exports = looptimeModule;
