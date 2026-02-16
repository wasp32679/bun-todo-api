import { Database } from 'bun:sqlite';

const sql = `create table if not exists todos (
    id text primary key,
    title text not null,
    content text,
    due_date text,
    done integer not null default 0
)`;

let db: Database;

try {
  db = new Database('mydb.sqlite');
  db.exec(sql);
} catch (err) {
  console.error('Failed to initialize database:', err);
  throw err;
}

export default db;
