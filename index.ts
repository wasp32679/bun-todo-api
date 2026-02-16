import * as v from 'valibot';
import db from './db';
import index from './index.html';

const TodoSchema = v.object({
  title: v.string(),
  content: v.optional(v.string()),
  due_date: v.optional(v.string()),
});

type Todo = v.InferOutput<typeof TodoSchema>;

const server = Bun.serve({
  port: 3000,
  routes: {
    '/': index,
    '/todos': {
      GET: () => {
        try {
          const data = db.query('select * from todos').all();
          return Response.json(data);
        } catch (error) {
          console.error('Failed to fetch todos:', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      },
      POST: async (req) => {
        try {
          const body = await req.json();
          const validated: Todo = v.parse(TodoSchema, body);

          const insertTodo = db.prepare(
            'insert into todos (title, content, due_date) values (?, ?, ?)',
          );

          insertTodo.run(
            validated.title,
            validated.content ?? null,
            validated.due_date ?? null,
          );

          return Response.json(validated, { status: 201 });
        } catch (error) {
          console.error(error);
          return new Response('Bad request.', { status: 400 });
        }
      },
    },
  },
});
