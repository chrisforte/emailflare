import { Hono } from 'hono';
import { getCloudflareTokenStatus } from '../services/cloudflare.js';

const app = new Hono();

// GET /api/cloudflare/status
app.get('/status', async (c) => {
  const status = await getCloudflareTokenStatus();
  return c.json(status);
});

export default app;
