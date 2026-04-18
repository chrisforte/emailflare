import { timingSafeEqual } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { env } from '../env.js';

export const requireAdminToken = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) throw new HTTPException(401, { message: 'Missing authorization token' });

  const expected = Buffer.from(env.ADMIN_TOKEN);
  const provided = Buffer.from(token);

  const valid =
    provided.length === expected.length &&
    timingSafeEqual(expected, provided);

  if (!valid) throw new HTTPException(401, { message: 'Invalid admin token' });

  await next();
});
