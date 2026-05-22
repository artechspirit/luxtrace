⚠️ Extends root AI_CONTEXT.md. NestJS Terbaru execution rules.

## PATTERNS
- Architecture: 1 Feature = 1 Module (`@Module()`). Strict boundaries.
- DI: Constructor injection only. `@Injectable()`. 🚫 Never `new Service()`.
- Controllers: Thin. Route mapping, DTO parse, return response. Logic di Service.
- Validation: Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Errors: Global `HttpExceptionFilter`. Extend `BaseException`. Format envelope exact.
- DB: WAJIB pakai ORM Prisma (`PrismaService` singleton). Repositories abstract Prisma. `$transaction` multi-step.
- OpenAPI: `@nestjs/swagger` decorators on DTOs & controllers. Auto-sync ke `packages/api-contracts`.

## 🚫 ANTI-PATTERNS
- Fat Controller (>15 baris) → PINDAH Service
- Direct Prisma di Controller → GANTI Repository
- Manual `try/catch` per route → GANTI Global Filter + Interceptor
- Hardcode config → GANTI `@nestjs/config` + Zod boot validation
- Circular imports → GANTI `forwardRef()` atau Event Bus
- Skip `@ApiProperty()` → WAJIB lengkap
- Prisma N+1 Queries (looping query beruntun) → WAJIB pakai `include`/`join` untuk relasi
- Upload File Berat ke Backend Server → GANTI pakai Pre-signed URL (S3/GCS) langsung dari Client
- Sinkronisasi Webhook lambat → GANTI Validasi Signature -> Return 200 Segera -> Proses Async
- Background Jobs tidak Idempotent → WAJIB Idempotent (aman jika di-retry berkali-kali)

## ✅ CHECKLIST
- [ ] Module structure complete
- [ ] Global ValidationPipe active
- [ ] ExceptionFilter returns envelope
- [ ] Prisma wrapped in Repository
- [ ] Swagger decorators complete
- [ ] No circular / manual config
- [ ] Tests critical path included