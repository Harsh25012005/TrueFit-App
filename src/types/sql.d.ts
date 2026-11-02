// Device migrations import .sql files as text (metro.sql-transformer.js / jest.sql-transformer.js).
declare module '*.sql' {
  const sql: string;
  export default sql;
}
