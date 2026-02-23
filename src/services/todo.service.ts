import db from '../db';
import type { PatchTodo } from '../schemas/patchTodoSchema';
import type { Todo } from '../schemas/todoSchema';

const todoService = {
  getAll: () => {
    return db.query('select * from todos').all();
  },

  createTodo: (validated: Todo) => {
    return db
      .prepare(
        'insert into todos (title, content, due_date, done) values (?, ?, ?, ?)',
      )
      .run(
        validated.title,
        validated.content ?? null,
        validated.due_date ?? null,
        validated.done ?? null,
      );
  },

  todoChanges: (validated: PatchTodo, id: number) => {
    const keys = Object.keys(validated);
    const allowedColumns = ['title', 'content', 'due_date', 'done'];
    const isValid = keys.every((key) => allowedColumns.includes(key));

    if (!isValid) {
      throw new Error('Invalid column update attempt');
    }

    const setClause = keys.map((key) => `${key} = ?`).join(', ');

    return db
      .prepare(`update todos set ${setClause} where id = ?`)
      .run(...Object.values(validated), id);
  },

  editedTodo: (id: number) => {
    return db.prepare('select * from todos where id = ?').get(id);
  },

  deleteTodo: (id: number) => {
    return db.prepare('delete from todos where id = ?').run(id);
  },
};

export default todoService;
