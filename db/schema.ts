// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,real,integer} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{user:text('user').primaryKey(),saved:text('saved').notNull().default('[]')});
export const journeys=sqliteTable('journeys',{id:text('id').primaryKey(),user:text('user').notNull(),destination:text('destination').notNull(),lat:real('lat'),lon:real('lon'),updated:integer('updated').notNull(),active:integer('active').notNull().default(1)});
