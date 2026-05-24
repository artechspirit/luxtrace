⚠️ Extends root AI_CONTEXT.md. Backend execution rules.

## BACKEND MODE
- Sebelum coding, AI WAJIB identifikasi backend mode project: `NestJS + Prisma` atau `Supabase-first`.
- Untuk `Supabase-first`, jangan generate NestJS/Prisma module baru kecuali ada migration plan dan approval.
- Untuk `NestJS + Prisma`, ikuti aturan di bawah secara strict.

## PATTERNS
- Architecture: 1 Feature = 1 Module (`@Module()`). Strict boundaries.
- DI: Constructor injection only. `@Injectable()`. 🚫 Never `new Service()`.
- Controllers: Thin. Route mapping, DTO parse, return response. Logic di Service.
- Validation source of truth: Zod schema. Gunakan custom Zod pipe/helper di controller boundary; `ValidationPipe` hanya boleh untuk transform primitive params jika memang diperlukan.
- Errors: Global `HttpExceptionFilter`. Extend `BaseException`. Format envelope exact.
- DB: WAJIB pakai ORM Prisma (`PrismaService` singleton). Repositories abstract Prisma. `$transaction` multi-step.
- OpenAPI: `@nestjs/swagger` decorators on DTOs & controllers. Auto-sync ke `packages/api-contracts`.

## 🚫 ANTI-PATTERNS
- Fat Controller (>15 baris) → PINDAH Service
- Direct Prisma di Controller → GANTI Repository
- Manual `try/catch` per route → GANTI Global Filter + Interceptor
- Class-validator sebagai sumber validasi body → GANTI Zod sebagai source of truth
- Hardcode config → GANTI `@nestjs/config` + Zod boot validation
- Circular imports → GANTI `forwardRef()` atau Event Bus
- Skip `@ApiProperty()` → WAJIB lengkap
- Prisma N+1 Queries (looping query beruntun) → WAJIB pakai `include`/`join` untuk relasi
- Upload File Berat ke Backend Server → GANTI pakai Pre-signed URL (S3/GCS) langsung dari Client
- Sinkronisasi Webhook lambat → GANTI Validasi Signature -> Return 200 Segera -> Proses Async
- Background Jobs tidak Idempotent → WAJIB Idempotent (aman jika di-retry berkali-kali)

## ✅ CHECKLIST
- [ ] Backend mode identified
- [ ] Module structure complete
- [ ] Zod validation active at request boundary
- [ ] ExceptionFilter returns envelope
- [ ] Prisma wrapped in Repository
- [ ] Swagger decorators complete
- [ ] No circular / manual config
- [ ] Tests critical path included
