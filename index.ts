import * as v from 'valibot';
import PatchTodoSchema from './src/schemas/patchTodoSchema';
import TodoSchema from './src/schemas/todoSchema';
import todoService from './src/services/todo.service';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Prefer',
};

function handleErrors(error: unknown) {
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
    const pathParts = path.split('/');

    const queryParamId = url.searchParams.get('id');
    let id = NaN;
    if (queryParamId && queryParamId.startsWith('eq.')) {
      id = parseInt(queryParamId.split('.')[1] as string, 10);
    } else {
      id = parseInt(pathParts[2] ?? '', 10);
    }

    const isItemRoute = !isNaN(id) && path.startsWith('/todos');

    if (method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    if (path === '/todos') {
      if (method === 'GET') {
        try {
          const data = todoService.getAll();
          return Response.json(data, { headers });
        } catch (e) {
          return handleErrors(e);
        }
      }

      if (method === 'POST') {
        try {
          const body = await req.json();
          const validated = v.parse(TodoSchema, body);

          const result = todoService.createTodo(validated);

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

          if (Object.keys(validated).length === 0) {
            return Response.json(
              { error: 'No fields to update' },
              { status: 400, headers },
            );
          }

          const result = todoService.todoChanges(validated, id);

          if (result.changes === 0) {
            return Response.json(
              { error: 'Todo not found' },
              { status: 404, headers },
            );
          }

          const updatedTodo = todoService.editedTodo(id);

          return Response.json(updatedTodo, { headers });
        } catch (e) {
          return handleErrors(e);
        }
      }

      if (method === 'DELETE') {
        try {
          const result = todoService.deleteTodo(id);
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
