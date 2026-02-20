import * as v from 'valibot';
export type Todo = v.InferOutput<typeof TodoSchema>;

export const TodoSchema = v.object({
  title: v.string(),
  content: v.optional(v.string()),
  due_date: v.optional(v.nullable(v.pipe(v.string(), v.isoDate()))),
  done: v.optional(
    v.pipe(
      v.boolean(),
      v.transform((v) => (v ? 1 : 0)),
    ),
  ),
});

export default TodoSchema;
