const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Make sure Metro resolves 'devlop'
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  devlop: require.resolve('devlop'),
};

module.exports = config;
