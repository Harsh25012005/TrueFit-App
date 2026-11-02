// Jest counterpart of metro.sql-transformer.js: a .sql file becomes a module exporting its text.
module.exports = {
  process(src) {
    return { code: `module.exports = ${JSON.stringify(src)};` };
  },
};
