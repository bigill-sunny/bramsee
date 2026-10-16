// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,real,integer,blob,primaryKey} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{user:text('user').primaryKey(),saved:text('saved').notNull().default('[]')});
export const journeys=sqliteTable('journeys',{id:text('id').primaryKey(),user:text('user').notNull(),destination:text('destination').notNull(),lat:real('lat'),lon:real('lon'),updated:integer('updated').notNull(),active:integer('active').notNull().default(1)});
export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),passwordHash:text('password_hash').notNull(),created:integer('created').notNull(),photo:blob('photo',{mode:'buffer'}),photoType:text('photo_type'),photoUpdated:integer('photo_updated'),emailVerified:integer('email_verified').notNull().default(0)});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expires:integer('expires').notNull()});
export const authAttempts=sqliteTable('auth_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
export const notices=sqliteTable('service_notices',{id:text('id').primaryKey(),agency:text('agency').notNull(),title:text('title').notNull(),description:text('description').notNull(),url:text('url').notNull(),detected:integer('detected').notNull(),lastSeen:integer('last_seen').notNull()});
export const noticeReads=sqliteTable('notice_reads',{userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),noticeId:text('notice_id').notNull().references(()=>notices.id,{onDelete:'cascade'}),seen:integer('seen').notNull()},t=>[primaryKey({columns:[t.userId,t.noticeId]})]);
export const noticeSources=sqliteTable('notice_sources',{agency:text('agency').primaryKey(),attempt:integer('attempt').notNull(),success:integer('success'),status:text('status').notNull()});
export const savedRoutes=sqliteTable('saved_routes',{userId:text('user_id').primaryKey().references(()=>accounts.id,{onDelete:'cascade'}),routes:text('routes').notNull().default('[]')});

export const accountTokens=sqliteTable('account_tokens',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),purpose:text('purpose').notNull(),expires:integer('expires').notNull()});
