import db from './db';
import index from './index.html';

const server = Bun.serve({
  port: 3000,
  routes: {
    '/': index,
    '/todos': () => {
      try {
        const data = db.query('select * from todos').all();
        return Response.json(data);
      } catch (error) {
        console.error('Failed to fetch todos:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    },
  },
});

console.log(`Listening on ${server.url}`);
