// Transparent GET-response cache layer for the axios api instance.
// - Stores in sessionStorage (cleared when tab closes).
// - TTL per route prefix; mutations invalidate related caches.
// No component changes required.

const PREFIX = 'apicache_v1::';

// Cacheable GET endpoints. Order matters — first match wins.
// Anything not matched here is NEVER cached (e.g. attendance, dashboards, lists that mutate often).
const RULES = [
  { test: (url) => /^\/auth\/me\b/.test(url),                    ttl: 120_000 },
  { test: (url) => /^\/users\/me\b/.test(url),                   ttl: 120_000 },
  { test: (url) => /^\/terms(\/|\?|$)/.test(url),                ttl: 300_000 },
  { test: (url) => /^\/programs(\/|\?|$)/.test(url),             ttl: 300_000 },
  { test: (url) => /^\/departments(\/|\?|$)/.test(url),          ttl: 300_000 },
  { test: (url) => /^\/curricula(\/|\?|$)/.test(url),            ttl: 300_000 },
  { test: (url) => /^\/courses(\/|\?|$)/.test(url),              ttl: 300_000 },
  { test: (url) => /^\/teachers(\/|\?|$)/.test(url),             ttl: 300_000 },
  { test: (url) => /^\/schedule\/config\b/.test(url),            ttl: 300_000 },
  { test: (url) => /^\/schedule\/slots\b/.test(url),             ttl: 300_000 },
  { test: (url) => /^\/rooms(\/|\?|$)/.test(url),                ttl: 300_000 },
  { test: (url) => /^\/holidays(\/|\?|$)/.test(url),             ttl: 600_000 },
  { test: (url) => /^\/ta\/my-active\b/.test(url),               ttl: 60_000  },
  { test: (url) => /^\/offerings\/my\b/.test(url),               ttl: 60_000  },
  { test: (url) => /^\/students\/me\b/.test(url),                ttl: 120_000 },
  { test: (url) => /^\/admissions\/settings\b/.test(url),        ttl: 300_000 },
];

// When a write hits one of these prefixes, all caches matching the listed prefixes get cleared.
const INVALIDATE = [
  { onWrite: '/terms',       bust: ['/terms'] },
  { onWrite: '/programs',    bust: ['/programs'] },
  { onWrite: '/departments', bust: ['/departments'] },
  { onWrite: '/curricula',   bust: ['/curricula', '/courses'] },
  { onWrite: '/courses',     bust: ['/courses', '/curricula'] },
  { onWrite: '/teachers',    bust: ['/teachers'] },
  { onWrite: '/users',       bust: ['/users', '/teachers', '/auth/me'] },
  { onWrite: '/schedule',    bust: ['/schedule', '/offerings'] },
  { onWrite: '/rooms',       bust: ['/rooms'] },
  { onWrite: '/holidays',    bust: ['/holidays'] },
  { onWrite: '/ta',          bust: ['/ta'] },
  { onWrite: '/offerings',   bust: ['/offerings', '/schedule'] },
  { onWrite: '/admissions',  bust: ['/admissions'] },
];

const findRule = (url) => RULES.find((r) => r.test(url));

const buildKey = (url, params) => {
  const p = params && Object.keys(params).length ? JSON.stringify(params) : '';
  return PREFIX + url + '::' + p;
};

const readCache = (key, ttl) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // quota exceeded — drop oldest entries
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => sessionStorage.removeItem(k));
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  }
};

const invalidateByMutationUrl = (url) => {
  if (!url) return;
  const rule = INVALIDATE.find((r) => url.startsWith(r.onWrite));
  if (!rule) return;
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const path = k.slice(PREFIX.length);
    if (rule.bust.some((p) => path.startsWith(p))) {
      sessionStorage.removeItem(k);
    }
  }
};

export const clearAllApiCache = () => {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(PREFIX)) sessionStorage.removeItem(k);
  }
};

export const attachCacheInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get') return config;

    const rule = findRule(config.url || '');
    if (!rule) return config;

    const key = buildKey(config.url, config.params);
    const cached = readCache(key, rule.ttl);
    if (cached !== null) {
      // Short-circuit: synthesize an axios response from cache.
      config.adapter = () => Promise.resolve({
        data: cached,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config,
        request: null,
      });
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const config = response.config || {};
      const method = (config.method || 'get').toLowerCase();
      const url = config.url || '';

      if (method === 'get' && response.status === 200 && response.statusText !== 'OK (cached)') {
        const rule = findRule(url);
        if (rule) {
          writeCache(buildKey(url, config.params), response.data);
        }
      } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
        invalidateByMutationUrl(url);
      }
      return response;
    },
    (error) => Promise.reject(error),
  );
};
