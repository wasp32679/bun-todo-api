import { Database } from 'bun:sqlite';

const sql = `
    create table if not exists todos (
    id text primary key,
    title text not null,
    content text,
    due_date text,
    done integer not null default 0
)`;

let db;

try {
  db = new Database('mydb.sqlite');
  db.exec(sql);
} catch (err) {
  console.log(err);
  throw err;
} finally {
  if (db) db.close(false);
}
