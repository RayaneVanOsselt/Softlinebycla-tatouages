/**
 * Journalisation structurée (JSON sur une ligne) sans données personnelles :
 * les adresses e-mail et champs sensibles sont masqués automatiquement.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SENSITIVE_KEYS = /^(email|to|replyTo|firstName|lastName|name|message|projectDescription|password|token|privateKey|pass)$/i;

function maskEmail(value: string) {
  return value.replace(/([^\s@]{1,2})[^\s@]*@([^\s@]+)/g, "$1***@$2");
}

function sanitize(value: unknown, key?: string, depth = 0): unknown {
  if (key && SENSITIVE_KEYS.test(key)) {
    if (typeof value === "string" && /@/.test(value)) return maskEmail(value);
    return value == null ? value : "[redacted]";
  }
  if (value instanceof Error) return { name: value.name, message: maskEmail(value.message), code: (value as { code?: unknown }).code };
  if (typeof value === "string") return maskEmail(value);
  if (depth > 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, undefined, depth + 1));
  return Object.fromEntries(Object.entries(value as Fields).map(([k, v]) => [k, sanitize(v, k, depth + 1)]));
}

function write(level: Level, event: string, fields?: Fields) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  if (process.env.VITEST && level !== "error") return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(sanitize(fields ?? {}) as Fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => write("debug", event, fields),
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
