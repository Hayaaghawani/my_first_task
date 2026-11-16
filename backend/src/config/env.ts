import { z } from "zod";

const positiveIntegerMessage = (name: string): string => `${name} must be a positive integer`;

function positiveInteger(name: string, maximum = Number.MAX_SAFE_INTEGER) {
  const message = positiveIntegerMessage(name);
  return z.coerce
    .number({ error: message })
    .int(message)
    .positive(message)
    .max(maximum, `${name} must be no greater than ${maximum}`)
    .refine(Number.isSafeInteger, message);
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function requiredHttpUrl(name: string) {
  return z
    .string({ error: `${name} is required` })
    .trim()
    .min(1, `${name} is required`)
    .refine(isAbsoluteHttpUrl, `${name} must be an absolute HTTP or HTTPS URL`);
}

const envSchema = z.object({
  PORT: positiveInteger("PORT", 65535).default(3001),
  FRONTEND_ORIGIN: requiredHttpUrl("FRONTEND_ORIGIN").default("http://localhost:5173"),
  SOLR_URL: requiredHttpUrl("SOLR_URL"),
  SOLR_TIMEOUT_MS: positiveInteger("SOLR_TIMEOUT_MS", 2 ** 32 - 1).default(3000),
  DB_HOST: z.string({ error: "DB_HOST is required" }).trim().min(1, "DB_HOST is required"),
  DB_PORT: positiveInteger("DB_PORT", 65535).default(3306),
  DB_USER: z.string({ error: "DB_USER is required" }).trim().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string({ error: "DB_NAME is required" }).trim().min(1, "DB_NAME is required"),
  MEMCACHED_HOST: z
    .string({ error: "MEMCACHED_HOST is required" })
    .trim()
    .min(1, "MEMCACHED_HOST is required")
    .default("localhost"),
  MEMCACHED_PORT: positiveInteger("MEMCACHED_PORT", 65535).default(11211),
});

export type AppConfig = {
  port: number;
  frontendOrigin: string;
  solrUrl: string;
  solrTimeoutMs: number;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  memcached: {
    host: string;
    port: number;
  };
};

function toAppConfig(env: z.infer<typeof envSchema>): AppConfig {
  return {
    port: env.PORT,
    frontendOrigin: env.FRONTEND_ORIGIN,
    solrUrl: env.SOLR_URL,
    solrTimeoutMs: env.SOLR_TIMEOUT_MS,
    db: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    },
    memcached: {
      host: env.MEMCACHED_HOST,
      port: env.MEMCACHED_PORT,
    },
  };
}

// dotenv stays in startup. This function only checks the values it is given,
// so tests can pass a plain object and a bad environment stops the process
// before any server or Solr call exists.
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return toAppConfig(result.data);
}
