// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
  require('path').resolve(__dirname, 'node_modules'),
];

module.exports = config;