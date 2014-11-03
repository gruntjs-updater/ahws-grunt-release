/*globals require, module*/
var exec = require('child_process').exec,
    replace = require("replace"),
    lodash = require("lodash");

/*
 * ahws-grunt-release
 * https://github.com/ahwswebdev/ahws-grunt-release
 *
 * Copyright (c) 2014 ahwswebdev
 * Licensed under the MIT license.
 */
module.exports = function (grunt) {

    'use strict';

    grunt.registerMultiTask('ahws_grunt_release', 'Update bower dependencies to the latest tags in git repo', function () {

        var options = this.options({
                dependenciesFileName: 'bower.json',
                branch: false
            }),

            getSize = function (dependencies) {
                var key, count = 0;
                for (key in dependencies) {
                    if (dependencies.hasOwnProperty(key)) {
                        count = count + 1;
                    }
                }
                return count;
            },

            dependency,
            bowerConfig = grunt.file.readJSON(options.dependenciesFileName),
            done = this.async(),
            after = lodash.after(getSize(bowerConfig.dependencies), done),

            replaceVersionNumber = function (gitRepositoryUrl, currentVersion, releaseVersion) {
                if (!releaseVersion) {
                    grunt.log.errorlns('No version number found for: ' + gitRepositoryUrl);
                }

                grunt.log.writeln('Replace version number for ' + gitRepositoryUrl + currentVersion + ' with ' + gitRepositoryUrl + "#" + releaseVersion);
                replace({
                    regex: gitRepositoryUrl + currentVersion,
                    replacement: gitRepositoryUrl + "#" + releaseVersion,
                    paths: ['bower.json'],
                    recursive: false,
                    silent: false
                });

                after();
            },

            findLatestVersionNumber = function (gitRepositoryUrl, currentVersion, stdout) {
                grunt.log.writeln('Find latest version number for ' + gitRepositoryUrl);
                var lines = stdout.toString().split('\n'),
                    latestVersionNumber = false;

                lines.forEach(function (line) {
                    var versionNumber = line.replace('v', '');
                    if (versionNumber.trim().length !== 0) {
                        latestVersionNumber = versionNumber;
                    }
                });

                replaceVersionNumber(gitRepositoryUrl, currentVersion, latestVersionNumber);
            },

            getVersion = function (gitRepositoryUrl, currentVersion) {
                exec('git ls-remote --tags ' + gitRepositoryUrl + ' | grep -v {} | awk -F\/ \'{printf("%s\\n", $3)}\' | sort -n -t. -k1,1 -k2,2 -k3,3 -k4,4', function (err, stdout) {
                    if (err) {
                        grunt.warn(err);
                    } else {
                        findLatestVersionNumber(gitRepositoryUrl, currentVersion, stdout);
                    }
                });
            },

            determineTask = function (dependency) {
                var gitRepositoryUrl = dependency.replace('git+https', 'https').replace(/#[a-z0-9.]+/, ''),
                    currentVersion = dependency.match(/#[a-z0-9.]+/)[0];

                if (options.branch) {
                    grunt.log.writeln('Setting version for: ' + gitRepositoryUrl + ' from version: ' + currentVersion + ' to branch: ' + options.branch);
                    replaceVersionNumber(gitRepositoryUrl, currentVersion, options.branch);
                } else {
                    grunt.log.writeln('Getting version for: ' + gitRepositoryUrl + ' with version: ' + currentVersion);
                    getVersion(gitRepositoryUrl, currentVersion);
                }
            };

        grunt.log.writeln('Options > dependenciesFileName: ' + options.dependenciesFileName + ' branch: ' + options.branch);

        for (dependency in bowerConfig.dependencies) {
            if (bowerConfig.dependencies.hasOwnProperty(dependency)) {
                determineTask(bowerConfig.dependencies[dependency]);
            }
        }
    });
};
