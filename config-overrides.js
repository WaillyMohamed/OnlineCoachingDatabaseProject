// config-overrides.js
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = function override(config, env) {
  // Add polyfills to the Webpack config
  config.plugins = [
    ...config.plugins,
    new NodePolyfillPlugin()
  ];

  return config;
};