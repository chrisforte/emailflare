const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  ADMIN_TOKEN: required('ADMIN_TOKEN'),
  SQLITE_HUB_API_KEY: required('SQLITE_HUB_API_KEY'),
  SQLITE_HUB_API_URL: process.env.SQLITE_HUB_API_URL ?? 'https://api.mesahub.app',
  SQLITE_HUB_DB: process.env.SQLITE_HUB_DB ?? 'emailflair',
  CF_API_TOKEN: process.env.CF_API_TOKEN ?? '',
  CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ?? '',
} as const;
