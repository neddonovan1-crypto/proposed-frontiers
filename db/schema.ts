import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const league = sqliteTable('league', {
 playerKey:text('player_key').primaryKey(), firstName:text('first_name').notNull(),
 score:integer('score').notNull(),peace:integer('peace').notNull(),durability:integer('durability').notNull(),cooperation:integer('cooperation').notNull(),
 edition:text('edition').notNull(), createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('league_score_idx').on(t.score)]);
