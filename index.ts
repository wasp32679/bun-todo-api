import db from './db';
import index from './index.html';

const server = Bun.serve({
  port: 3000,
  routes: {
    '/': index,
    '/todos': () => {
      const data = db.query('select * from todos').all();
      return Response.json(data);
    },
  },
});

console.log(`Listening on ${server.url}`);
