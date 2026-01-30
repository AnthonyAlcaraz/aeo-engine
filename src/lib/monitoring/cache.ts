import { prisma } from "@/lib/db";
import crypto from "crypto";

const TTL_PROBE_MS = 24 * 60 * 60 * 1000; // 24 hours
const TTL_CONTENT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheType = "probe" | "content";

export function getCacheKey(
  provider: string,
  model: string,
  prompt: string
): string {
  const raw = `${provider}:${model}:${prompt}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function getCached(key: string): Promise<string | null> {
  const entry = await prisma.cacheEntry.findUnique({
    where: { key },
  });

  if (!entry) return null;

  if (entry.expiresAt < new Date()) {
    // Expired — clean up asynchronously, return null
    await prisma.cacheEntry.delete({ where: { key } }).catch(() => {
      // Ignore deletion errors (race condition with clearExpiredCache)
    });
    return null;
  }

  return entry.value;
}

export async function setCache(
  key: string,
  value: string,
  type: CacheType
): Promise<void> {
  const ttl = type === "probe" ? TTL_PROBE_MS : TTL_CONTENT_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await prisma.cacheEntry.upsert({
    where: { key },
    update: {
      value,
      type,
      expiresAt,
    },
    create: {
      key,
      value,
      type,
      expiresAt,
    },
  });
}

export async function clearExpiredCache(): Promise<number> {
  const result = await prisma.cacheEntry.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
