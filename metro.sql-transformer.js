// Lets Metro bundle drizzle-kit's device migrations (`import m0000 from './0000_x.sql'`):
// a .sql file becomes a module whose default export is its text. Everything else goes to
// Expo's normal Babel transformer. (Same job as babel-plugin-inline-import, without the dependency.)
const upstream = require('@expo/metro-config/build/babel-transformer');

module.exports = {
  ...upstream,
  transform(args) {
    if (args.filename.endsWith('.sql')) {
      return upstream.transform({ ...args, src: `module.exports = ${JSON.stringify(args.src)};` });
    }
    return upstream.transform(args);
  },
};
