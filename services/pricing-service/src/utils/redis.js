import Redis from 'ioredis';
import { latLngToZone } from './geohash.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEMAND_TTL_SECONDS = 300; // 5 phút — sau đó event demand tự hủy

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

/**
 * Lấy số lượng tài xế đang active trong zone của tọa độ cho trước.
 * Đọc Supply từ key "supply:zone:<geohash>" được driver-service ghi vào.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number>} số tài xế (0 nếu không có ai hoặc Redis lỗi)
 */
export async function getSupplyCount(lat, lng) {
  try {
    const client = getRedisClient();
    const zone = latLngToZone(lat, lng);
    const count = await client.scard(`supply:zone:${zone}`);
    return count;
  } catch (err) {
    console.error('[pricing-service/redis] getSupplyCount thất bại:', err.message);
    return 0;
  }
}

/**
 * Ghi 1 sự kiện "khách đang hỏi giá" vào zone tương ứng.
 * Dùng requestId làm unique member để tránh 1 khách bị đếm nhiều lần
 * nếu họ hỏi giá trong cùng 1 request.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} requestId - ID duy nhất của request (từ x-request-id header)
 */
export async function recordDemandEvent(lat, lng, requestId) {
  try {
    const client = getRedisClient();
    const zone = latLngToZone(lat, lng);
    const key = `demand:zone:${zone}`;

    await client.sadd(key, requestId);
    await client.expire(key, DEMAND_TTL_SECONDS);
  } catch (err) {
    console.error('[pricing-service/redis] recordDemandEvent thất bại:', err.message);
  }
}

/**
 * Lấy số lượng lượt hỏi giá gần đây trong zone.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number>} số lượt demand (0 nếu không có hoặc Redis lỗi)
 */
export async function getDemandCount(lat, lng) {
  try {
    const client = getRedisClient();
    const zone = latLngToZone(lat, lng);
    const count = await client.scard(`demand:zone:${zone}`);
    return count;
  } catch (err) {
    console.error('[pricing-service/redis] getDemandCount thất bại:', err.message);
    return 0;
  }
}

/**
 * Đọc kết quả AI (XGBoost) surge multiplier do ML Platform đẩy vào Redis.
 * ML Platform chạy background job mỗi 30 giây, predict rồi ghi vào
 * key "surge_zone:{geohash}" với TTL 90 giây.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number|null>} surge multiplier từ AI, hoặc null nếu chưa có
 */
export async function getAISurge(lat, lng) {
  try {
    const client = getRedisClient();
    const zone = latLngToZone(lat, lng);
    const raw = await client.get(`surge_zone:${zone}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const multiplier = parseFloat(parsed.multiplier);
    if (isNaN(multiplier)) return null;

    console.info(`[pricing-service/redis] AI surge zone=${zone} multiplier=${multiplier} source=${parsed.source}`);
    return multiplier;
  } catch (err) {
    console.error('[pricing-service/redis] getAISurge thất bại:', err.message);
    return null;
  }
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

