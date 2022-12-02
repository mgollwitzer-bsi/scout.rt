/*
 * Copyright (c) 2010-2022 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// argv[0] path to node
// argv[1] path to js file
// argv[2] name of called script
// argv[3..n] arguments for the script
const script = process.argv[2];
const argv = process.argv.slice(3);
const parser = require('yargs-parser');
const fs = require('fs');
const path = require('path');
const scoutBuildConstants = require('./../scripts/constants');
const webpackConfigFileName = './webpack.config.js';
const webpackCustomConfigFileName = './webpack.config.custom.js';
const webpackYargsOptions = {
  boolean: ['progress', 'profile', 'clean'],
  array: ['resDirArray', 'themes']
};
const buildYargsOptions = {
  array: ['run'],
  default: {run: []}
};
const karmaYargsOptions = prepareWebpackYargsOptionsForKarma();

let buildArgs = parser(argv, buildYargsOptions);
if (buildArgs.run.length > 1) {
  runBuilds(buildArgs);
  return;
}

switch (script) {
  case 'test-server:start': {
    runKarma(null, false, parser(argv, karmaYargsOptions));
    break;
  }
  case 'test-server:stop': {
    const stopper = require('karma').stopper;
    // default port assumed
    stopper.stop({port: 9876}, exitCode => {
      if (exitCode === 0) {
        console.log('Server stop as initiated');
      }
      process.exitCode = exitCode;
    });
    break;
  }
  case 'test:ci': {
    let args = parser(argv, karmaYargsOptions);
    args.webpackArgs = args.webpackArgs || {};
    if (args.webpackArgs.progress === undefined) {
      args.webpackArgs.progress = false;
    }
    runKarma(null, true, args);
    break;
  }
  case 'build:dev': {
    const args = parser(argv, webpackYargsOptions);
    args.mode = scoutBuildConstants.mode.development;
    runWebpack(args);
    break;
  }
  case 'build:prod': {
    const args = parser(argv, webpackYargsOptions);
    args.mode = scoutBuildConstants.mode.production;
    runWebpack(args);
    break;
  }
  case 'build:dev:watch': {
    const args = parser(argv, webpackYargsOptions);
    args.mode = scoutBuildConstants.mode.development;
    args.watch = true;
    runWebpack(args);
    break;
  }
  default:
    console.log(`Unknown script "${script}"`);
    break;
}

function runBuilds(args) {
  const execSync = require('child_process').execSync;
  let argStr = '';
  for (let [key, value] of Object.entries(args)) {
    if (key !== 'run' && key !== '_') {
      argStr += `--${key} ${value} `;
    }
  }
  for (let type of args.run) {
    console.log(`Starting ${type} build` + (argStr ? ` with args ${argStr}` : ''));
    execSync(`scout-scripts ${script} --run ${type} ${argStr}`, {stdio: 'inherit'});
  }
}

function runKarma(configFileName, headless, args) {
  const cfg = require('karma').config;
  const cfgFile = configFileName || './karma.conf.js';

  let configFilePath = null;
  let autoSetupHeadlessConfig = headless;
  if (headless) {
    // try with CI config file first
    const ciConfigFilePath = path.resolve('./karma.conf.ci.js');
    if (fs.existsSync(ciConfigFilePath)) {
      configFilePath = ciConfigFilePath;
      autoSetupHeadlessConfig = false; // no need to autoconfig for headless mode because there is a specific CI config file
    }
  }
  if (configFilePath == null) {
    configFilePath = path.resolve(cfgFile);
  }
  if (!fs.existsSync(configFilePath)) {
    // No config file found -> abort
    console.log(`Skipping Karma test run (config file ${cfgFile} not found)`);
    return;
  }

  // load config
  const karmaConfig = cfg.parseConfig(configFilePath, args);
  if (autoSetupHeadlessConfig) {
    // only executed if headless and no specific CI config file is found: use headless defaults
    karmaConfig.set({
      singleRun: true,
      autoWatch: false,
      browsers: ['ChromeHeadless']
    });
  }

  let exitCode = 100;
  const Server = require('karma').Server;
  const serverInstance = new Server(karmaConfig, karmaExitCode => {
    if (exitCode === 0) {
      console.log('Karma has exited with 0.');
      process.exit(0); // all fine: tests could be executed and no failures
    } else if (exitCode > 1) { // the custom exitCodes
      console.log(`Error in test execution. Exit code: ${exitCode}.`);
      process.exit(exitCode); // tests could not be executed because of an error. Let the process fail.
    } else {
      console.log(`There are test failures. Karma has exited with ${exitCode}.`);
      process.exit(0); // test could be executed but there are test failures: do not set exitCode here because the build should continue even on failing tests.
    }
  });

  serverInstance.on('run_complete', (browsers, results) => {
    // Karma returns exitCode 1 for all results. Therefore, there is no possibility to distinguish the case that tests failed or that the test execution had errors.
    // To solve this, a custom exitCode is computed which allows separating several cases.
    exitCode = computeExitCode(results);
  });

  console.log(`Starting Karma server using config file ${configFilePath}`);
  serverInstance.start();
}

/**
 * Inspired by Karma.BrowserCollection.calculateExitCode().
 *
 * @param results The Karma results object
 * @returns {number} The custom exit code
 */
function computeExitCode(results) {
  if (results.disconnected) {
    return 2;
  }
  if (results.error) {
    return 3;
  }
  return results.exitCode;
}

function runWebpack(args) {
  const configFilePath = readWebpackConfig();
  if (!configFilePath) {
    return;
  }
  const {compiler, statsConfig} = createWebpackCompiler(configFilePath, args);
  if (args.watch) {
    compiler.watch({}, (err, stats) => logWebpack(err, stats, statsConfig));
  } else {
    compiler.run((err, stats) => logWebpack(err, stats, statsConfig));
  }
}

function readWebpackConfig() {
  let configFilePath;
  const devConfigFilePath = path.resolve(webpackCustomConfigFileName);
  if (fs.existsSync(devConfigFilePath)) {
    console.log(`Reading config from ${webpackCustomConfigFileName}`);
    configFilePath = devConfigFilePath;
  } else {
    configFilePath = path.resolve(webpackConfigFileName);
  }
  if (!fs.existsSync(configFilePath)) {
    // No config file found -> abort
    console.log(`Skipping webpack build (config file ${webpackConfigFileName} not found)`);
    return;
  }
  return configFilePath;
}

function createWebpackCompiler(configFilePath, args) {
  const webpack = require('webpack');
  const conf = require(configFilePath);
  const webpackConfig = conf(args.env, args);
  const statsConfig = args.stats || webpackConfig.stats;
  const compiler = webpack(webpackConfig);
  return {compiler, statsConfig};
}

function logWebpack(err, stats, statsConfig) {
  if (err) {
    console.error(err);
    return;
  }
  const info = stats.toJson();
  if (stats.hasErrors()) {
    console.error(info.errors);
    process.exitCode = 1; // let the webpack build fail on errors
  }
  if (stats.hasWarnings()) {
    console.warn(info.warnings);
  }
  statsConfig = statsConfig || {};
  if (typeof statsConfig === 'string') {
    statsConfig = stats.compilation.createStatsOptions(statsConfig);
  }
  statsConfig.colors = true;
  console.log(stats.toString(statsConfig) + '\n\n');
}

/**
 * Prepends the values of the arrays in the options with webpackArgs.
 */
function prepareWebpackYargsOptionsForKarma() {
  let result = {};
  for (let [key, value] of Object.entries(webpackYargsOptions)) {
    if (Array.isArray(value)) {
      value = value.map(elem => 'webpackArgs.' + elem);
    }
    result[key] = value;
  }
  return result;
}
