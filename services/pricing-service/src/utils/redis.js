import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;

/**
 * Lấy (hoặc khởi tạo lần đầu) Redis client theo Singleton pattern.
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('[pricing-service/redis] Đã thử kết nối 5 lần thất bại, bỏ qua Redis.');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    redisClient.on('connect', () => {
      console.info('[pricing-service/redis] ✅ Kết nối Redis thành công!');
    });

    redisClient.on('error', (err) => {
      console.error('[pricing-service/redis] ❌ Lỗi Redis:', err.message);
    });

    redisClient.connect().catch((err) => {
      console.error('[pricing-service/redis] Không thể kết nối Redis khi khởi động:', err.message);
    });
  }
  return redisClient;
}

// ── Quote locking (Tiêu chí 5 — Nhất quán giá estimate→booking) ─────────────

const QUOTE_TTL_SECONDS = 180; // 3 phút — đủ thời gian user xác nhận đặt xe

/**
 * Lưu snapshot giá vào Redis với TTL 180 giây.
 * Sau khi hết TTL, quote tự động hết hạn — user cần lấy giá mới.
 *
 * @param {string} quoteId - UUID duy nhất đại diện cho quote này
 * @param {object} quoteData - { amount, surgeMultiplier, vehicleType, distanceKm, durationMin, ... }
 */
export async function saveQuote(quoteId, quoteData) {
  try {
    const client = getRedisClient();
    const key = `quote:${quoteId}`;
    await client.setex(key, QUOTE_TTL_SECONDS, JSON.stringify(quoteData));
    console.info(`[pricing-service/redis] 💾 Quote saved: quoteId=${quoteId} TTL=${QUOTE_TTL_SECONDS}s`);
  } catch (err) {
    console.error('[pricing-service/redis] saveQuote thất bại:', err.message);
    // Không throw — quote lỗi không nên chặn cả getQuote
  }
}

/**
 * Đọc quote KHÔNG xóa — dùng để hiển thị lại giá khi dedup hit.
 *
 * @param {string} quoteId
 * @returns {Promise<object|null>}
 */
export async function readQuote(quoteId) {
  try {
    const client = getRedisClient();
    const raw = await client.get(`quote:${quoteId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[pricing-service/redis] readQuote thất bại:', err.message);
    return null;
  }
}

/**
 * Đọc và XÓA quote khỏi Redis (one-time use).
 * Nếu quote không tồn tại hoặc đã hết hạn → trả về null.
 * Dùng GETDEL để đảm bảo atomic: không thể dùng cùng quote_id 2 lần.
 *
 * @param {string} quoteId
 * @returns {Promise<object|null>} quoteData hoặc null nếu không tìm thấy/hết hạn
 */
export async function getAndConsumeQuote(quoteId) {
  try {
    const client = getRedisClient();
    const key = `quote:${quoteId}`;
    // GETDEL — atomic: GET + DEL trong 1 command (Redis >= 6.2)
    const raw = await client.getdel(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    console.info(`[pricing-service/redis] ✅ Quote consumed: quoteId=${quoteId}`);
    return parsed;
  } catch (err) {
    console.error('[pricing-service/redis] getAndConsumeQuote thất bại:', err.message);
    return null;
  }
}

/**
 * Đọc quote lock (dedup) theo fingerprint route.
 * Trả về { quoteId, ttl } nếu còn hạn, hoặc null nếu đã hết.
 *
 * @param {string} lockKey - fingerprint key, e.g. 'quote:lock:{hash}'
 */
export async function getQuoteLock(lockKey) {
  try {
    const client = getRedisClient();
    const [quoteId, ttl] = await Promise.all([
      client.get(lockKey),
      client.ttl(lockKey),
    ]);
    if (!quoteId || ttl <= 0) return null;
    return { quoteId, ttl };
  } catch (err) {
    console.error('[pricing-service/redis] getQuoteLock thất bại:', err.message);
    return null;
  }
}

/**
 * Lưu quote lock (dedup pointer) cùng TTL với quote.
 *
 * @param {string} lockKey  - fingerprint key
 * @param {string} quoteId  - UUID của quote vừa tạo
 * @param {number} ttl      - TTL tính bằng giây
 */
export async function saveQuoteLock(lockKey, quoteId, ttl = QUOTE_TTL_SECONDS) {
  try {
    const client = getRedisClient();
    await client.setex(lockKey, ttl, quoteId);
    console.info(`[pricing-service/redis] 🔒 Quote lock saved: key=${lockKey} quoteId=${quoteId} TTL=${ttl}s`);
  } catch (err) {
    console.error('[pricing-service/redis] saveQuoteLock thất bại:', err.message);
  }
}
