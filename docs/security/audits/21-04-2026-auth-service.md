# CAB-BOOKING Security Audit Report - AUTH-SERVICE

**Date**: 21-04-2026
**Target**: `services/auth-service`
**Audit Model**: Zero Trust Baseline

---

### 1. Findings Table

| # | Finding | Severity | Evidence Path | Fix Direction |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **MFA Secret Exposure in DB** | 🔴 **P0** | `mfa.service.js:128`, `schema.sql:99` | Encrypt TOTP secrets before storage using AES-256-GCM. |
| 2 | **Misleading Column Naming** | 🟡 **P1** | `schema.sql:99` (`secret_encrypted`) | Fix code to actually encrypt or rename column (not recommended). |
| 3 | **Internal Plaintext Communication** | 🔴 **P0** | `docker-stack.yml:259-277` (Kafka), `api-gateway` URLs | Implement mTLS/TLS for all service-to-service and Kafka traffic. |
| 4 | **Lack of Secret Management** | 🟡 **P1** | `docker-stack.yml:137-152`, `security.js` | Integrate with Vault or AWS/GCP Secret Manager instead of ENV. |
| 5 | **Missing Key Rotation Evidence** | 🔵 **P2** | `lib/jwt.js:136-140` | Implement automated key rotation via CLI or management service. |

---

### 2. PASS/FAIL Checklist

| Requirement | Result | Evidence / Notes |
| :--- | :--- | :--- |
| **JWT Verify (iss, aud, alg)** | ✅ **PASS** | `lib/jwt.js:91-93`, `api-gateway/src/security/jwt-service.js:34-38`. Enforces RS256. |
| **Short-lived Access Token** | ✅ **PASS** | `lib/jwt.js:66` (`accessTokenTtlMinutes`). Configurable TTL. |
| **Refresh Token Rotation** | ✅ **PASS** | `session.service.js:161-173`. Mỗi lần refresh sẽ cấp token mới. |
| **Refresh Replay Detection** | ✅ **PASS** | `session.service.js:116-135`. Revoke toàn bộ family khi phát hiện reuse. |
| **Revocation / Blacklist** | ✅ **PASS** | `session.service.js:372-377`. Lưu revoked session vào Redis marker. |
| **Admin MFA Enforcement** | ✅ **PASS** | `admin-auth.service.js:98-104`. Yêu cầu challenge trước khi cấp token. |
| **Brute-force Protection** | ✅ **PASS** | `auth-rate-limit.middleware.js`. Throttling theo `role:destination:ip`. |
| **Structured Audit Logging** | ✅ **PASS** | `schema.sql:80-93`, `session.service.js` (login, refresh, logout). |
| **Password Hashing** | ✅ **PASS** | `lib/password.js:1-10`. Sử dụng Argon2id với salt mạnh. |
| **Zero Trust Depth** | ✅ **PASS** | `api-gateway` gọi `/me` để verify revocation trạng thái thực thay vì chỉ check signature. |
| **mTLS / Service Identity** | ❌ **FAIL** | `Expected by architecture` nhưng repo chỉ dùng plain HTTP/Docker overlay. |
| **Fail-Closed Behavior** | ✅ **PASS** | `app.js:141-174`. Reject request 503 nếu Redis/Postgres down. |

---

### 3. Cross-Service Gaps

- **Gateway vs Downstream**: Các service downstream nhận identity field (userId) trực tiếp từ header mà không verify ownership (Confirmed gap in `auth-service-security.md`).
- **Internal Network**: Không có mTLS hay mesh logic, tin tưởng hoàn toàn vào LAN (Docker overlay).

---

### 4. Evidence Still Needed

- **Runtime Key Rotation**: Code có support `previousKid` nhưng chưa thấy script thực hiện xoay vòng key thực tế.
- **Encryption at rest**: Cần kiểm tra DB engine config (TDE) để xem có layer encryption nào khác bảo vệ cột MFA secret hay không.

---

### 5. Fix Priority (P0 -> P2)

- **P0 (Critical)**:
    - **Mã hóa MFA Secret**: Thực hiện mã hóa cột `mfa_enrollments.secret_encrypted` trong code trước khi `INSERT`. Đây là ưu tiên cao nhất vì rủi ro lộ lọt toàn bộ MFA secrets nếu DB bị tấn công.
    - **TLS cho Kafka**: Cấu hình TLS cho Kafka (hiện đang dùng `PLAINTEXT`) để ngăn chặn sniffing identity events nhạy cảm trên mạng nội bộ.
- **P1 (High)**:
    - **Secrets Management**: Di chuyển các secret nhạy cảm (JWT Private Key, DB Password) từ environment variables sang Docker Secrets hoặc HashiCorp Vault.
    - **Downstream Ownership Validation**: Đồng bộ hóa logic rà soát ownership ở các service downstream (như `ride-service`) để không tin tưởng mù quáng vào header từ Gateway (giải quyết Cross-service Gap).
- **P2 (Medium)**:
    - **JWT Rotation**: Triển khai cơ chế xoay vòng key (rotation) định kỳ cho JWT (đã có code support, cần workflow vận hành).
    - **Observability Hardening**: Bổ sung `correlation-id` xuyên suốt vào các log của `notification-service` khi gửi OTP để dễ dàng truy vết và điều tra các dấu hiệu bypass hoặc abuse.
