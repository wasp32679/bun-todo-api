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

const PatchTodoSchema = v.object({
  id: v.number(),
  title: v.optional(v.string()),
  content: v.optional(v.nullable(v.string())),
  due_date: v.optional(v.nullable(v.pipe(v.string(), v.isoDate()))),
  done: v.optional(
    v.pipe(
      v.boolean(),
      v.transform((v) => (v ? 1 : 0)),
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

          const insertTodo = db.prepare(
            'insert into todos (title, content, due_date) values ( ?, ?, ?)',
          );

          const result = insertTodo.run(
            validated.title,
            validated.content ?? null,
            validated.due_date ?? null,
          );
          const newId = result.lastInsertRowid;

          return Response.json(
            { id: Number(newId), ...validated },
            { status: 201 },
          );
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
      PATCH: async (req) => {
        try {
          const body = await req.json();
          const validated = v.parse(PatchTodoSchema, body);

          const { id, ...updates } = validated;

          const keys = Object.keys(updates);

          if (keys.length === 0) {
            return Response.json(
              { error: 'Aucun champ à modifier' },
              { status: 400 },
            );
          }

          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const query = db.prepare(`
            update todos
            set ${setClause}
            where id = ?`);

          const values = [...Object.values(updates), id];

          const result = query.run(...values);

          if (result.changes === 0) {
            return Response.json({ error: 'Todo not found' }, { status: 404 });
          }

          return Response.json({ message: 'Update succesful', id });
        } catch (error) {
          console.error(error);
          return Response.json(
            {
              error: 'Update failed',
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
