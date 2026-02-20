import * as v from 'valibot';
import db from './db';

const TodoSchema = v.object({
  title: v.string(),
  content: v.optional(v.string()),
  due_date: v.optional(v.nullable(v.pipe(v.string(), v.isoDate()))),
  done: v.pipe(
    v.boolean(),
    v.transform((v) => (v ? 1 : 0)),
  ),
});

const PatchTodoSchema = v.object({
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Prefer',
};

function handleErrors(error: any) {
  if (error instanceof v.ValiError) {
    return Response.json(
      {
        error: 'Validation failed',
        details: error.issues.map((i) => i.message),
      },
      { status: 400, headers },
    );
  }
  console.error(error);
  return new Response('Internal Server Error', { status: 500, headers });
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    const path =
      url.pathname.endsWith('/') && url.pathname.length > 1
        ? url.pathname.slice(0, -1)
        : url.pathname;

    if (method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    const pathParts = path.split('/');
    const queryParamId = url.searchParams.get('id');

    let id = NaN;
    if (queryParamId && queryParamId.startsWith('eq.')) {
      id = parseInt(queryParamId.split('.')[1] as string, 10);
    } else {
      id = parseInt(pathParts[2] ?? '', 10);
    }

    const isItemRoute = !isNaN(id) && path.startsWith('/todos');

    if (path === '/todos') {
      if (method === 'GET') {
        try {
          const data = db.query('select * from todos').all();
          return Response.json(data, { headers });
        } catch (e) {
          return handleErrors(e);
        }
      }

      if (method === 'POST') {
        try {
          const body = await req.json();
          const validated = v.parse(TodoSchema, body);

          const result = db
            .prepare(
              'insert into todos (title, content, due_date, done) values (?, ?, ?, ?)',
            )
            .run(
              validated.title,
              validated.content ?? null,
              validated.due_date ?? null,
              validated.done,
            );

          return Response.json(
            { id: Number(result.lastInsertRowid), ...validated },
            { status: 201, headers },
          );
        } catch (e) {
          return handleErrors(e);
        }
      }
    }

    if (isItemRoute) {
      if (isNaN(id)) {
        return Response.json(
          { error: 'Invalid ID format' },
          { status: 400, headers },
        );
      }

      if (method === 'PATCH') {
        try {
          const body = await req.json();
          const validated = v.parse(PatchTodoSchema, body);
          const keys = Object.keys(validated);

          if (keys.length === 0) {
            return Response.json(
              { error: 'No fields to update' },
              { status: 400, headers },
            );
          }

          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const result = db
            .prepare(`update todos set ${setClause} where id = ?`)
            .run(...Object.values(validated), id);

          if (result.changes === 0) {
            return Response.json(
              { error: 'Todo not found' },
              { status: 404, headers },
            );
          }

          const updatedTodo = db
            .prepare('select * from todos where id = ?')
            .get(id);

          return Response.json(updatedTodo, { headers });
        } catch (e) {
          return handleErrors(e);
        }
      }

      if (method === 'DELETE') {
        try {
          const result = db.prepare('delete from todos where id = ?').run(id);

          if (result.changes === 0) {
            return Response.json(
              { error: 'Todo not found' },
              { status: 404, headers },
            );
          }

          return new Response(null, { status: 204, headers });
        } catch (e) {
          return handleErrors(e);
        }
      }
    }

    return new Response('Not Found', { status: 404, headers });
  },
});
