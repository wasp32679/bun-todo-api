import * as v from 'valibot';
import db from './db';
import index from './index.html';

const TodoSchema = v.object({
  title: v.string(),
  content: v.optional(v.string()),
  due_date: v.optional(
    v.pipe(
      v.string(),
      v.isoDate('Due date must be a valid ISO 8601 date string.'),
    ),
  ),
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

          const id = crypto.randomUUID();
          const insertTodo = db.prepare(
            'insert into todos (id, title, content, due_date) values (?, ?, ?, ?)',
          );

          insertTodo.run(
            id,
            validated.title,
            validated.content ?? null,
            validated.due_date ?? null,
          );

          return Response.json({ ...validated, id }, { status: 201 });
        } catch (error) {
          if (error instanceof v.ValiError) {
            return Response.json(
              {
                message: 'Validation failed',
                issues: error.issues.map((i) => i.message),
              },
              { status: 400 },
            );
          }
          console.error('Failed to create todo:', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      },
    },
  },
});
