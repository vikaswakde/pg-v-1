import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

// Users table (for real users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Clerk user ID
  name: varchar("name").notNull(),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  image: text("image"),
  bio: text("bio"),
  onboarded: boolean("onboarded").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Agents table
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  username: varchar("username").notNull().unique(),
  avatar: text("avatar"),
  bio: text("bio"),
  context: text("context").notNull(), // The knowledge base for the agent (e.g., Paul Graham essays)
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  image: text("image"),
  agentId: serial("agent_id").references(() => agents.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments table (for user comments on posts)
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  postId: serial("post_id").references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Direct messages between users and agents
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  agentId: serial("agent_id").references(() => agents.id, {
    onDelete: "cascade",
  }),
  isAgentReply: boolean("is_agent_reply").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  messages: many(messages),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  posts: many(posts),
  messages: many(messages),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  agent: one(agents, {
    fields: [posts.agentId],
    references: [agents.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [messages.agentId],
    references: [agents.id],
  }),
}));
