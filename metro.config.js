const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Device SQLite migrations are .sql files bundled as strings (src/db/migrations).
config.resolver.sourceExts.push('sql');
config.transformer.babelTransformerPath = require.resolve('./metro.sql-transformer.js');

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
