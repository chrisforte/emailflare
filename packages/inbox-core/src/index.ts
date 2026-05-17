/**
 * @emailflare/inbox-core
 *
 * Shared types, Zod validation schemas, and pure helpers used by both:
 *   - services/inbox-worker  (Cloudflare Worker — D1, R2, KV, DO, Queues)
 *   - services/inbox-server  (Node.js — MesaHub, Redis)
 *
 * Rules for this package:
 *   - NO runtime-specific code (no D1, no MesaHub, no Node.js APIs, no Web Crypto)
 *   - Only types, Zod schemas, and pure functions (no side effects)
 *
 * TODO: Extract from services/inbox-worker and services/inbox-server:
 *   - Row interfaces:   InboxRow, ContactRow, MessageRow, ThreadRow, AttachmentRow
 *   - Zod schemas:      inboxCreateSchema, contactSchema, messageSearchSchema
 *   - Pure helpers:     parseEmailAddress(), threadId(), extractPlainText()
 */

export {};
