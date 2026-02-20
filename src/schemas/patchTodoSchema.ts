import * as v from 'valibot';

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

export type PatchTodo = v.InferOutput<typeof PatchTodoSchema>;
export default PatchTodoSchema;
