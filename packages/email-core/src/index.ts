/**
 * @emailflare/email-core
 *
 * Shared types, Zod validation schemas, and pure helpers used by both:
 *   - services/email-worker  (Cloudflare Worker — D1, KV)
 *   - services/email-server  (Node.js — MesaHub)
 *
 * Rules for this package:
 *   - NO runtime-specific code (no D1, no MesaHub, no Node.js APIs, no Web Crypto)
 *   - Only types, Zod schemas, and pure functions (no side effects)
 *
 * TODO: Extract from services/email-worker and services/email-server:
 *   - Row interfaces:   DomainRow, TemplateRow, ApiKeyRow, ApiKeyDomainRow, EmailLogRow, SuppressionRow
 *   - Zod schemas:      sendSchema, domainCreateSchema, templateSchema
 *   - Pure helpers:     applyVariables(), toSlug(), enrich()
 */

export {};
