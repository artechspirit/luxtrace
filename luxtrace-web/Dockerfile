# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build the application ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ── Build-time env vars ───────────────────────────────────────────────────────
# NEXT_PUBLIC_* vars are embedded into the JS bundle at build time
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Server-side vars: Next.js traces API routes during build (page data collection)
# which triggers module-level validation in lib/supabase.ts and others.
# These are only needed at BUILD TIME for tracing — real values injected at runtime by Cloud Run.
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_KEY
ARG SUPABASE_ANON_KEY
ARG MIDTRANS_SERVER_KEY
ARG MIDTRANS_CLIENT_KEY
ARG THIRDWEB_SECRET_KEY
ARG BRAND_WALLET_PRIVATE_KEY
ARG BRAND_WALLET_ADDRESS
ARG NFT_CONTRACT_ADDRESS
ARG WALLET_MASTER_SEED
ARG NFC_SECRET_SALT
ARG QR_ENCRYPTION_KEY

ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV MIDTRANS_SERVER_KEY=$MIDTRANS_SERVER_KEY
ENV MIDTRANS_CLIENT_KEY=$MIDTRANS_CLIENT_KEY
ENV THIRDWEB_SECRET_KEY=$THIRDWEB_SECRET_KEY
ENV BRAND_WALLET_PRIVATE_KEY=$BRAND_WALLET_PRIVATE_KEY
ENV BRAND_WALLET_ADDRESS=$BRAND_WALLET_ADDRESS
ENV NFT_CONTRACT_ADDRESS=$NFT_CONTRACT_ADDRESS
ENV WALLET_MASTER_SEED=$WALLET_MASTER_SEED
ENV NFC_SECRET_SALT=$NFC_SECRET_SALT
ENV QR_ENCRYPTION_KEY=$QR_ENCRYPTION_KEY

RUN npm run build

# ─── Stage 3: Production runtime (minimal image) ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what Next.js standalone output needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run injects PORT env variable — Next.js standalone server respects it
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
