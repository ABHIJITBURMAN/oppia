var argv = require('yargs').argv;
var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
var path = require('path');
var generatedJs = 'third_party/generated/js/third_party.js';
const isDocker = require('is-docker')();
if (argv.prodEnv) {
  generatedJs = (
    'third_party/generated/js/third_party.min.js');
}

module.exports = function(config) {
  config.set({
    basePath: '../../',
    frameworks: ['jasmine'],
    files: [
      'local_compiled_js/core/tests/karma-globals.js',
      // Constants must be loaded before everything else.
      // Since jquery,jquery-ui,angular,angular-mocks and math-expressions
      // are not bundled, they will be treated separately.
      'third_party/static/jquery-3.4.1/jquery.min.js',
      'third_party/static/jqueryui-1.12.1/jquery-ui.min.js',
      'third_party/static/angularjs-1.5.8/angular.js',
      'third_party/static/angularjs-1.5.8/angular-mocks.js',
      'third_party/static/headroom-js-0.9.4/headroom.min.js',
      'third_party/static/headroom-js-0.9.4/angular.headroom.min.js',
      'third_party/static/math-expressions-1.7.0/math-expressions.js',
      'third_party/static/ckeditor-4.9.2/ckeditor.js',
      generatedJs,
      // Note that unexpected errors occur ("Cannot read property 'num' of
      // undefined" in MusicNotesInput.js) if the order of core/templates/...
      // and extensions/... are switched. The test framework may be flaky.
      'core/templates/dev/head/**/*_directive.html',
      'core/templates/dev/head/**/*.directive.html',
      'core/templates/dev/head/**/*.template.html',
      'local_compiled_js/extensions/**/*.js',
      'core/templates/dev/head/AppInit.ts',
      // This is a file that is generated on running the run_frontend_tests.sh
      // script. This generated file is a combination of all the spec files
      // since Karma is unable to run tests on multiple files due to some
      // unknown reason.
      'core/templates/dev/head/combined-tests.spec.ts',
      {
        pattern: 'extensions/**/*.png',
        watched: false,
        served: true,
        included: false
      },
      'extensions/interactions/**/*.directive.html',
      'extensions/interactions/rule_templates.json',
      'core/tests/data/*.json',
      {
        pattern: 'assets/i18n/**/*.json',
        watched: true,
        served: true,
        included: false
      }
    ],
    exclude: [
      'local_compiled_js/core/templates/dev/head/**/*-e2e.js',
      'local_compiled_js/extensions/**/protractor.js',
      'backend_prod_files/extensions/**',
    ],
    proxies: {
      // Karma serves files under the /base directory.
      // We access files directly in our code, for example /folder/,
      // so we need to proxy the requests from /folder/ to /base/folder/.
      '/assets/': '/base/assets/',
      '/extensions/': '/base/extensions/'
    },
    preprocessors: {
      'core/templates/dev/head/*.ts': ['webpack'],
      'core/templates/dev/head/**/*.ts': ['webpack'],
      'extensions/**/*.ts': ['webpack'],
      // Note that these files should contain only directive templates, and no
      // Jinja expressions. They should also be specified within the 'files'
      // list above.
      'core/templates/dev/head/**/*_directive.html': ['ng-html2js'],
      'core/templates/dev/head/**/*.directive.html': ['ng-html2js'],
      'core/templates/dev/head/**/*.template.html': ['ng-html2js'],
      'extensions/interactions/**/*.directive.html': ['ng-html2js'],
      'extensions/interactions/rule_templates.json': ['json_fixtures'],
      'core/tests/data/*.json': ['json_fixtures']
    },
    reporters: ['progress', 'coverage-istanbul'],
    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly'],
      dir: '../karma_coverage_reports/',
      fixWebpackSourcePaths: true,
      'report-config': {
        html: { outdir: 'html' }
      }
    },
    autoWatch: true,
    browsers: ['Chrome_Travis'],
    // Kill the browser if it does not capture in the given timeout [ms].
    captureTimeout: 60000,
    browserConsoleLogOptions: {
      level: 'log',
      format: '%b %T: %m',
      terminal: true
    },
    browserNoActivityTimeout: 60000,
    // Continue running in the background after running tests.
    singleRun: true,
    customLaunchers: {
      Chrome_Travis: {
        // Karma can only connect to ChromeHeadless when inside Docker.
        base: isDocker ? 'ChromeHeadless' : 'Chrome',
        // Discussion of the necessity of extra flags can be found here:
        // https://github.com/karma-runner/karma-chrome-launcher/issues/154
        // https://github.com/karma-runner/karma-chrome-launcher/issues/180
        flags: isDocker ? [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security'
        ] : ['--no-sandbox']
      }
    },

    plugins: [
      'karma-coverage-istanbul-reporter',
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-ng-html2js-preprocessor',
      'karma-json-fixtures-preprocessor',
      'karma-coverage',
      'karma-webpack'
    ],
    ngHtml2JsPreprocessor: {
      moduleName: 'directiveTemplates',
      // ngHtml2JsPreprocessor adds the html inside $templateCache,
      // the key that we use for that cache needs to be exactly the same as
      // the templateUrl in directive JS. The stripPrefix and prependPrefix are
      // used for modifying the $templateCache keys.
      // If the key starts with core/ we need to get rid of that.
      stripPrefix: 'core/',
      // Every key must start with /.
      prependPrefix: '/',
    },
    jsonFixturesPreprocessor: {
      variableName: '__fixtures__'
    },

    webpack: {
      mode: 'development',
      resolve: {
        modules: [
          'core/tests/data',
          'assets',
          'core/templates/dev/head',
          'extensions',
          'node_modules',
          'third_party',
        ],
        extensions: ['.ts', '.js', '.json', '.html', '.svg', '.png']
      },
      devtool: 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: [
              'cache-loader',
              'thread-loader',
              {
                loader: 'ts-loader',
                options: {
                  // this is needed for thread-loader to work correctly
                  happyPackMode: true
                }
              }
            ]
          },
          {
            test: /\.html$/,
            loader: 'underscore-template-loader'
          },
          {
            test: /\.ts$/,
            enforce: 'post',
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: { esModules: true }
            }
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
          }
        ]
      },
      plugins: [
        new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true })
      ]
    }
  });
};
