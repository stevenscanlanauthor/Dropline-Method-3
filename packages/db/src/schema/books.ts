import { pgTable, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const booksTable = pgTable(
  'books',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled Project'),
    authorName: text('author_name').notNull().default(''),
    project: jsonb('project').notNull().$type<Record<string, unknown>>(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [uniqueIndex('books_user_id_id_idx').on(t.userId, t.id)],
);

export type Book = typeof booksTable.$inferSelect;
export type InsertBook = typeof booksTable.$inferInsert;
