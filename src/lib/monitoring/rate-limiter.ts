interface RateLimiterConfig {
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
  dailyCostCap: number; // USD
}

interface UsageWindow {
  tokens: number;
  requests: number;
  windowStart: number; // epoch ms
}

interface DailyUsage {
  cost: number;
  dayStart: number; // epoch ms
}

const PROVIDER_LIMITS: Record<string, RateLimiterConfig> = {
  openai: {
    maxTokensPerMinute: 100_000,
    maxRequestsPerMinute: 60,
    dailyCostCap: 5.0,
  },
  anthropic: {
    maxTokensPerMinute: 100_000,
    maxRequestsPerMinute: 60,
    dailyCostCap: 5.0,
  },
  google: {
    maxTokensPerMinute: 100_000,
    maxRequestsPerMinute: 60,
    dailyCostCap: 5.0,
  },
  perplexity: {
    maxTokensPerMinute: 100_000,
    maxRequestsPerMinute: 60,
    dailyCostCap: 5.0,
  },
};

const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 86_400_000;

// In-memory tracking
const minuteWindows = new Map<string, UsageWindow>();
const dailyUsage = new Map<string, DailyUsage>();

function getProviderConfig(provider: string): RateLimiterConfig {
  return (
    PROVIDER_LIMITS[provider] ?? {
      maxTokensPerMinute: 100_000,
      maxRequestsPerMinute: 60,
      dailyCostCap: 5.0,
    }
  );
}

function getCurrentMinuteWindow(provider: string): UsageWindow {
  const now = Date.now();
  const existing = minuteWindows.get(provider);

  if (existing && now - existing.windowStart < ONE_MINUTE_MS) {
    return existing;
  }

  const fresh: UsageWindow = { tokens: 0, requests: 0, windowStart: now };
  minuteWindows.set(provider, fresh);
  return fresh;
}

function getCurrentDailyUsage(provider: string): DailyUsage {
  const now = Date.now();
  const existing = dailyUsage.get(provider);

  if (existing && now - existing.dayStart < ONE_DAY_MS) {
    return existing;
  }

  const fresh: DailyUsage = { cost: 0, dayStart: now };
  dailyUsage.set(provider, fresh);
  return fresh;
}

export function canMakeRequest(provider: string): boolean {
  const config = getProviderConfig(provider);
  const window = getCurrentMinuteWindow(provider);
  const daily = getCurrentDailyUsage(provider);

  if (window.tokens >= config.maxTokensPerMinute) return false;
  if (window.requests >= config.maxRequestsPerMinute) return false;
  if (daily.cost >= config.dailyCostCap) return false;

  return true;
}

export function recordUsage(
  provider: string,
  tokens: number,
  cost: number
): void {
  const window = getCurrentMinuteWindow(provider);
  window.tokens += tokens;
  window.requests += 1;

  const daily = getCurrentDailyUsage(provider);
  daily.cost += cost;
}

export function getRemainingBudget(provider: string): {
  tokens: number;
  requests: number;
  dailyBudget: number;
} {
  const config = getProviderConfig(provider);
  const window = getCurrentMinuteWindow(provider);
  const daily = getCurrentDailyUsage(provider);

  return {
    tokens: Math.max(0, config.maxTokensPerMinute - window.tokens),
    requests: Math.max(0, config.maxRequestsPerMinute - window.requests),
    dailyBudget: Math.max(0, config.dailyCostCap - daily.cost),
  };
}

export { PROVIDER_LIMITS };
export type { RateLimiterConfig };
