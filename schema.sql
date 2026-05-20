-- ==========================================
-- LUXTRACE SYSTEM DATABASE SCHEMA
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'CONSUMER')),
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_idr NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('MANUFACTURED', 'REGISTERED', 'OWNED', 'IN_TRANSIT')),
    nft_token_id TEXT,
    nfc_bound BOOLEAN DEFAULT false NOT NULL,
    current_owner_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    blockchain_tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. NFC Tags Table
CREATE TABLE IF NOT EXISTS public.nfc_tags (
    nfc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfc_uid TEXT UNIQUE NOT NULL,
    secure_key_hash TEXT UNIQUE NOT NULL,
    product_id UUID UNIQUE REFERENCES public.products(product_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('PRIMARY_BOUTIQUE', 'P2P_REMOTE_SHIPPING', 'P2P_DIRECT_HANDOVER')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'FRAUD_FLAGGED')),
    product_id UUID REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    amount_idr NUMERIC NOT NULL,
    payment_ref TEXT UNIQUE,
    blockchain_tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. QR Sessions Table
CREATE TABLE IF NOT EXISTS public.qr_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID UNIQUE REFERENCES public.transactions(transaction_id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
    encrypted_payload TEXT NOT NULL,
    is_used BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Product Logs Table
CREATE TABLE IF NOT EXISTS public.product_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
    event TEXT NOT NULL CHECK (event IN ('MANUFACTURED', 'REGISTERED', 'BRAND_OUTLET', 'TRANSFERRED', 'FRAUD_ATTEMPT')),
    actor_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    actor_role TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Manufacturing Batches Table
CREATE TABLE IF NOT EXISTS public.manufacturing_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED')),
    total_submitted INTEGER NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0,
    results JSONB DEFAULT '[]'::jsonb NOT NULL,
    failed JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- RPC 1: Append successful mint result to batch
CREATE OR REPLACE FUNCTION public.batch_append_result(
    p_batch_id UUID,
    p_result JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.manufacturing_batches
    SET 
        results = results || jsonb_build_array(p_result),
        processed = processed + 1
    WHERE batch_id = p_batch_id;
END;
$$;

-- RPC 2: Append failed mint result to batch
CREATE OR REPLACE FUNCTION public.batch_append_failed(
    p_batch_id UUID,
    p_serial TEXT,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.manufacturing_batches
    SET 
        failed = failed || jsonb_build_array(jsonb_build_object('serial_number', p_serial, 'reason', p_reason)),
        processed = processed + 1
    WHERE batch_id = p_batch_id;
END;
$$;

