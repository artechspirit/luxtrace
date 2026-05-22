"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import Alert from "@/components/Alert";
import { withMinimumDelay } from "@/lib/loader-helper";
import QRCode from "qrcode";

// ─── DATA SEEDING ─────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  {
    product_id: "prod-1",
    serial_number: "LUX-2026-00012",
    brand: "Hermès",
    name: "Birkin 30 Togo Gold",
    status: "OWNED",
    nft_token_id: "782",
    wallet: "0x3F6A...E884",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: { batch_id: "B-2026-X8", location: "Hermès Atelier, Paris" },
        timestamp: "2026-05-01T08:00:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: {
          nft_token_id: "782",
          tx_hash: "0x89d2...3eef",
          nfc_uid: "04:F2:88:A2:9B:40",
        },
        timestamp: "2026-05-01T14:22:15Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: {
          invoice: "INV-HE-9921",
          boutique: "Hermès Boutique, Plaza Indonesia",
          tx_hash: "0x74a2...ff01",
        },
        timestamp: "2026-05-05T11:00:00Z",
      },
      {
        event: "TRANSFERRED",
        actor_role: "CONSUMER",
        metadata: {
          via: "P2P_DIRECT_HANDOVER",
          tx_hash: "0x3bc9...a311",
          from: "0xBrand...Custody",
          to: "0x3F6A...E884",
        },
        timestamp: "2026-05-19T16:45:00Z",
      },
    ],
  },
  {
    product_id: "prod-2",
    serial_number: "LUX-2026-00085",
    brand: "Patek Philippe",
    name: "Nautilus 5711/1A",
    status: "IN_TRANSIT",
    nft_token_id: "109",
    wallet: "0x98D2...1A2B",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: {
          batch_id: "B-2026-W3",
          location: "Patek Manufacture, Geneva",
        },
        timestamp: "2026-05-02T09:15:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: {
          nft_token_id: "109",
          tx_hash: "0x51da...8a22",
          nfc_uid: "04:A1:B2:C3:D4:E5",
        },
        timestamp: "2026-05-02T16:05:40Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: {
          invoice: "INV-PP-0882",
          boutique: "Patek Salon, Place Vendôme",
          tx_hash: "0x9d2e...44f0",
        },
        timestamp: "2026-05-08T10:12:00Z",
      },
    ],
  },
  {
    product_id: "prod-3",
    serial_number: "LUX-2026-00104",
    brand: "Audemars Piguet",
    name: 'Royal Oak "Jumbo"',
    status: "REGISTERED",
    nft_token_id: "351",
    wallet: "0xAP_Custody...88B0",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: {
          batch_id: "B-2026-A1",
          location: "Le Brassus, Switzerland",
        },
        timestamp: "2026-05-04T07:11:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: {
          nft_token_id: "351",
          tx_hash: "0xe2b2...89a2",
          nfc_uid: "04:77:88:99:AA:BB",
        },
        timestamp: "2026-05-04T12:00:30Z",
      },
    ],
  },
  {
    product_id: "prod-4",
    serial_number: "LUX-2026-00219",
    brand: "Louis Vuitton",
    name: "Courrier Lozine 110",
    status: "OWNED",
    nft_token_id: "904",
    wallet: "0x71C9...8E3F",
    timeline: [
      {
        event: "MANUFACTURED",
        actor_role: "OPERATOR",
        metadata: {
          batch_id: "B-2026-L5",
          location: "Asnières Atelier, France",
        },
        timestamp: "2026-04-20T08:00:00Z",
      },
      {
        event: "REGISTERED",
        actor_role: "system",
        metadata: {
          nft_token_id: "904",
          tx_hash: "0xa8c2...12db",
          nfc_uid: "04:12:34:56:78:90",
        },
        timestamp: "2026-04-20T15:30:00Z",
      },
      {
        event: "BRAND_OUTLET",
        actor_role: "system",
        metadata: {
          invoice: "INV-LV-7762",
          boutique: "Louis Vuitton Maison Champs-Élysées",
          tx_hash: "0xb7c8...e044",
        },
        timestamp: "2026-04-25T14:15:00Z",
      },
      {
        event: "TRANSFERRED",
        actor_role: "CONSUMER",
        metadata: {
          via: "P2P_REMOTE_SHIPPING",
          tx_hash: "0xd28a...b881",
          from: "0xLouis...Custody",
          to: "0x71C9...8E3F",
        },
        timestamp: "2026-05-18T10:05:00Z",
      },
    ],
  },
];

const INITIAL_TRANSACTIONS = [
  {
    id: "TX-9901",
    product_id: "prod-1",
    product: "Hermès Birkin 30 Togo Gold",
    serial: "LUX-2026-00012",
    type: "P2P_DIRECT_HANDOVER",
    amount: "Rp 350.000.000",
    status: "COMPLETED",
    date: "May 19, 2026",
  },
  {
    id: "TX-9844",
    product_id: "prod-2",
    product: "Patek Philippe Nautilus 5711/1A",
    serial: "LUX-2026-00085",
    type: "P2P_REMOTE_SHIPPING",
    amount: "Rp 1.450.000.000",
    status: "IN_TRANSIT",
    date: "May 18, 2026",
  },
  {
    id: "TX-9812",
    product_id: "prod-4",
    product: "Louis Vuitton Courrier Lozine 110",
    serial: "LUX-2026-00219",
    type: "P2P_REMOTE_SHIPPING",
    amount: "Rp 420.000.000",
    status: "COMPLETED",
    date: "May 18, 2026",
  },
  {
    id: "TX-9788",
    product_id: "prod-3",
    product: "Audemars Piguet Royal Oak",
    serial: "LUX-2026-00104",
    type: "PRIMARY_BOUTIQUE",
    amount: "Rp 750.000.000",
    status: "PENDING",
    date: "May 17, 2026",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'products' | 'transactions' | 'boutique'
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─── BOUTIQUE SELL STATE ───────────────────────────────────────────────────
  const [boutiqueProducts, setBoutiqueProducts] = useState<any[]>([]);
  const [boutiqueSearch, setBoutiqueSearch] = useState("");
  const [selectedBoutiqueProduct, setSelectedBoutiqueProduct] = useState<
    any | null
  >(null);
  const [boutiqueBuyerEmail, setBoutiqueBuyerEmail] = useState("");
  const [isBoutiqueSubmitting, setIsBoutiqueSubmitting] = useState(false);
  const [isBoutiqueLoadingProducts, setIsBoutiqueLoadingProducts] =
    useState(false);
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    qrDataUrl: string;
    saleResult: any | null;
  }>({ isOpen: false, qrDataUrl: "", saleResult: null });
  const [boutiqueSaleMode, setBoutiqueSaleMode] = useState<"escrow" | "direct">(
    "escrow",
  );

  // ─── TRANSACTION DETAILS INSPECTOR STATE ──────────────────────────────────
  const [selectedTxDetail, setSelectedTxDetail] = useState<any | null>(null);
  const [selectedProductNfcUid, setSelectedProductNfcUid] = useState<
    string | null
  >(null);
  const [txQrDataUrl, setTxQrDataUrl] = useState<string>("");
  const [isLoadingTxQr, setIsLoadingTxQr] = useState(false);

  // Dynamic KPIs calculations from active state
  const totalTwins = products.length;

  const activeEscrowsList = transactions.filter((t) =>
    ["PENDING", "PAID", "IN_TRANSIT"].includes(t.status),
  );
  const activeEscrowsCount = activeEscrowsList.length;
  const lockedVolumeVal = activeEscrowsList.reduce(
    (sum, t) => sum + (t.amountNum || 0),
    0,
  );

  const formatVolume = (val: number) => {
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(2)}M`;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const activeHandoversCount = transactions.filter(
    (t) =>
      t.type === "P2P_DIRECT_HANDOVER" &&
      ["PENDING", "PAID", "IN_TRANSIT"].includes(t.status),
  ).length;

  // Sync tab with URL search parameter on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["dashboard", "products", "transactions", "boutique"].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Switch tabs and update URL query param without full page reload
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
    // Fetch boutique products when switching to boutique tab
    if (tab === "boutique") {
      fetchBoutiqueProducts();
    }
  };

  // Loader states
  const [isLoaderOpen, setIsLoaderOpen] = useState(false);
  const [loaderTitle, setLoaderTitle] = useState("");
  const [loaderMessage, setLoaderMessage] = useState("");

  // Alert states
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "error",
  ) => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  // Pagination states
  const [dashboardPage, setDashboardPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [escrowsPage, setEscrowsPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Reset registry pagination when filters change
  useEffect(() => {
    setProductsPage(1);
  }, [searchQuery, productStatusFilter]);

  // Load real data from REST endpoints if authenticated
  useEffect(() => {
    const token = localStorage.getItem("luxtrace_token");
    if (!token) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch current admin profile
        try {
          const userRes = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = await userRes.json();
          if (userRes.ok && userData.success) {
            setAdminUser(userData.data);
          }
        } catch (e) {
          console.warn("[Dashboard] Failed to fetch admin profile.", e);
        }

        // Fetch products
        const prodRes = await fetch("/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!prodRes.ok) throw new Error("Products request failed");
        const prodData = await prodRes.json();
        if (!prodData.success || !Array.isArray(prodData.data.items)) {
          throw new Error("Products data format invalid");
        }

        const mappedProducts = await Promise.all(
          prodData.data.items.map(async (p: any) => {
            let timeline: any[] = [];
            try {
              const provRes = await fetch(`/api/provenance/${p.product_id}`);
              const provData = await provRes.json();
              if (provRes.ok && provData.success) {
                timeline = provData.data.timeline || [];
              }
            } catch (e) {}
            return {
              product_id: p.product_id,
              serial_number: p.serial_number,
              brand: p.brand,
              name: p.name,
              status: p.status,
              nft_token_id: p.nft_token_id || "",
              wallet: p.current_owner_id || "0xBrand...Custody",
              timeline,
            };
          }),
        );
        setProducts(mappedProducts);
        if (mappedProducts.length > 0) {
          setSelectedProduct(mappedProducts[0]);
        } else {
          setSelectedProduct(null);
        }

        // Fetch transactions
        const txRes = await fetch("/api/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!txRes.ok) throw new Error("Transactions request failed");
        const txData = await txRes.json();
        if (!txData.success || !Array.isArray(txData.data)) {
          throw new Error("Transactions data format invalid");
        }

        const mappedTxs = txData.data.map((t: any) => ({
          id: t.transaction_id,
          product_id: t.product_id,
          product: t.product_name || `Product ${t.product_id.slice(0, 8)}`,
          serial: t.serial_number || "N/A",
          type: t.type,
          amount: `Rp ${t.amount_idr.toLocaleString("id-ID")}`,
          amountNum: t.amount_idr,
          status: t.status,
          date: new Date(t.created_at).toLocaleDateString(),
          payment_ref: t.payment_ref,
        }));
        setTransactions(mappedTxs);
      } catch (err) {
        console.warn(
          "[Dashboard] Failed to fetch real data, falling back to mock seed data.",
          err,
        );
        const seededTxs = INITIAL_TRANSACTIONS.map((tx: any) => ({
          ...tx,
          amountNum: parseInt(tx.amount.replace(/[^0-9]/g, ""), 10),
        }));
        setProducts(INITIAL_PRODUCTS);
        setTransactions(seededTxs);
        if (INITIAL_PRODUCTS.length > 0) {
          setSelectedProduct(INITIAL_PRODUCTS[0]);
        } else {
          setSelectedProduct(null);
        }
      }
    };

    fetchData();
  }, [router]);

  const isUuid = (id?: string) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  };

  const getSecurityHeaders = (token: string) => {
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-nonce": nonce,
      "x-timestamp": timestamp,
    };
  };

  const refreshData = async () => {
    const token = localStorage.getItem("luxtrace_token");
    if (!token) return;

    try {
      // Fetch products
      const prodRes = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prodData = await prodRes.json();
      if (
        prodRes.ok &&
        prodData.success &&
        Array.isArray(prodData.data.items)
      ) {
        const mappedProducts = await Promise.all(
          prodData.data.items.map(async (p: any) => {
            let timeline: any[] = [];
            try {
              const provRes = await fetch(`/api/provenance/${p.product_id}`);
              const provData = await provRes.json();
              if (provRes.ok && provData.success) {
                timeline = provData.data.timeline || [];
              }
            } catch (e) {}
            return {
              product_id: p.product_id,
              serial_number: p.serial_number,
              brand: p.brand,
              name: p.name,
              status: p.status,
              nft_token_id: p.nft_token_id || "",
              wallet: p.current_owner_id || "0xBrand...Custody",
              timeline,
            };
          }),
        );
        setProducts(mappedProducts);
        if (selectedProduct) {
          const updatedSelected = mappedProducts.find(
            (x) => x.product_id === selectedProduct.product_id,
          );
          if (updatedSelected) setSelectedProduct(updatedSelected);
        }
      }

      // Fetch transactions
      const txRes = await fetch("/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();
      if (txRes.ok && txData.success && Array.isArray(txData.data)) {
        const mappedTxs = txData.data.map((t: any) => ({
          id: t.transaction_id,
          product_id: t.product_id,
          product: t.product_name || `Product ${t.product_id.slice(0, 8)}`,
          serial: t.serial_number || "N/A",
          type: t.type,
          amount: `Rp ${t.amount_idr.toLocaleString("id-ID")}`,
          amountNum: t.amount_idr,
          status: t.status,
          date: new Date(t.created_at).toLocaleDateString(),
          payment_ref: t.payment_ref,
        }));
        setTransactions(mappedTxs);
      }
    } catch (e) {
      console.warn("[Dashboard] Failed to refresh data:", e);
    }
  };

  useEffect(() => {
    const prodId =
      selectedTxDetail?.product?.product_id || selectedProduct?.product_id;
    if (prodId) {
      setSelectedProductNfcUid(null);
      const fetchNfcUid = async () => {
        try {
          const token = localStorage.getItem("luxtrace_token") || "";
          const res = await fetch(`/api/products/${prodId}/nfc-debug`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setSelectedProductNfcUid(data.data.nfc_uid);
          }
        } catch (e) {
          console.warn("Failed to fetch NFC UID:", e);
        }
      };
      fetchNfcUid();
    } else {
      setSelectedProductNfcUid(null);
    }
  }, [selectedProduct, selectedTxDetail]);

  // ─── BOUTIQUE SELL HANDLERS ───────────────────────────────────────────────
  const fetchBoutiqueProducts = useCallback(async () => {
    const token = localStorage.getItem("luxtrace_token");
    if (!token) return;
    setIsBoutiqueLoadingProducts(true);
    try {
      const res = await fetch("/api/boutique/products?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setBoutiqueProducts(json.data.products || []);
      }
    } catch (e) {
      console.warn("[Boutique] Failed to load products:", e);
    } finally {
      setIsBoutiqueLoadingProducts(false);
    }
  }, []);

  const handleInitiateBoutiqueSale = async () => {
    if (!selectedBoutiqueProduct) {
      showAlert(
        "Select Product",
        "Please select a product from the boutique inventory.",
        "warning",
      );
      return;
    }
    if (!boutiqueBuyerEmail.trim()) {
      showAlert(
        "Buyer Email Required",
        "Enter the registered email address of the buyer.",
        "warning",
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(boutiqueBuyerEmail.trim())) {
      showAlert(
        "Invalid Email",
        "Please enter a valid email address.",
        "warning",
      );
      return;
    }

    setIsBoutiqueSubmitting(true);
    try {
      const token = localStorage.getItem("luxtrace_token") || "";
      const res = await fetch("/api/boutique/initiate-sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedBoutiqueProduct.product_id,
          buyer_email: boutiqueBuyerEmail.trim().toLowerCase(),
          sale_mode: boutiqueSaleMode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = json.error?.code ?? "UNKNOWN";
        showAlert(
          `[${code}]`,
          json.error?.message ?? "Sale initiation failed",
          "error",
        );
        return;
      }

      // Generate QR code based on boutiqueSaleMode
      let qrDataUrl = "";
      if (boutiqueSaleMode === "direct") {
        if (json.data.session_id) {
          qrDataUrl = await QRCode.toDataURL(
            JSON.stringify({ session_id: json.data.session_id }),
            {
              width: 280,
              margin: 2,
              color: { dark: "#0A0A0A", light: "#FFFFFF" },
              errorCorrectionLevel: "M",
            },
          );
        }
      } else {
        const paymentUrl = json.data.payment_url;
        if (paymentUrl) {
          qrDataUrl = await QRCode.toDataURL(paymentUrl, {
            width: 280,
            margin: 2,
            color: { dark: "#0A0A0A", light: "#FFFFFF" },
            errorCorrectionLevel: "M",
          });
        }
      }

      setQrModal({ isOpen: true, qrDataUrl, saleResult: json.data });
      await refreshData();
    } catch (err: any) {
      showAlert(
        "Network Error",
        err.message ?? "Check your connection and try again.",
        "error",
      );
    } finally {
      setIsBoutiqueSubmitting(false);
    }
  };

  const resetBoutiqueSale = () => {
    setSelectedBoutiqueProduct(null);
    setBoutiqueBuyerEmail("");
    setBoutiqueSearch("");
    setBoutiqueSaleMode("escrow");
  };

  const handleInspectTransaction = async (txId: string) => {
    setSelectedTxDetail(null);
    setTxQrDataUrl("");
    setIsLoadingTxQr(false);

    const token = localStorage.getItem("luxtrace_token");
    if (!token) return;

    setLoaderTitle("Fetching Transaction Details");
    setLoaderMessage("Reading transaction status and joining ledger record...");
    setIsLoaderOpen(true);

    try {
      const txRes = await fetch(`/api/transactions/${txId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();
      if (!txRes.ok || !txData.success) {
        throw new Error(
          txData.message || "Failed to fetch transaction details",
        );
      }

      const tx = txData.data;
      setSelectedTxDetail(tx);
      setIsLoaderOpen(false);

      const isP2PEscrowPending =
        tx.type === "P2P_REMOTE_SHIPPING" && tx.status === "PENDING";

      if (isP2PEscrowPending) {
        if (tx.payment_url) {
          setIsLoadingTxQr(true);
          try {
            const dataUrl = await QRCode.toDataURL(tx.payment_url, {
              width: 200,
              margin: 1,
              color: { dark: "#000000", light: "#FFFFFF" },
            });
            setTxQrDataUrl(dataUrl);
          } catch (qrErr) {
            console.error("Failed to generate Midtrans payment QR:", qrErr);
          } finally {
            setIsLoadingTxQr(false);
          }
        }
      } else {
        const canHaveProximityQr =
          (tx.type === "PRIMARY_BOUTIQUE" && tx.status === "PENDING") ||
          (tx.type === "P2P_DIRECT_HANDOVER" && tx.status === "PENDING") ||
          (tx.type === "P2P_REMOTE_SHIPPING" &&
            (tx.status === "PAID" || tx.status === "IN_TRANSIT"));

        if (canHaveProximityQr) {
          setIsLoadingTxQr(true);
          try {
            const qrRes = await fetch(`/api/transactions/${txId}/qr`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const qrData = await qrRes.json();
            if (qrRes.ok && qrData.success && qrData.data?.session_id) {
              const dataUrl = await QRCode.toDataURL(
                JSON.stringify({ session_id: qrData.data.session_id }),
                {
                  width: 200,
                  margin: 1,
                  color: { dark: "#000000", light: "#FFFFFF" },
                },
              );
              setTxQrDataUrl(dataUrl);
            }
          } catch (qrErr) {
            console.warn(
              "Failed to fetch QR details for transaction inspect:",
              qrErr,
            );
          } finally {
            setIsLoadingTxQr(false);
          }
        }
      }
    } catch (err: any) {
      setIsLoaderOpen(false);
      showAlert(
        "Error Inspecting Transaction",
        err.message || "Transaction details unavailable",
        "error",
      );
    }
  };

  // ─── INTEGRATED SIMULATION HANDLERS ──────────────────────────────────────────
  const handlePaymentSuccess = async (txId?: string) => {
    setLoaderTitle("Payment Settlement");
    setLoaderMessage("Verifying incoming bank deposit via Midtrans IRIS...");
    setIsLoaderOpen(true);
    try {
      const token = localStorage.getItem("luxtrace_token") || "";
      if (txId && isUuid(txId)) {
        // Real database transaction — call actual endpoint
        const response = await fetch(
          `/api/transactions/${txId}/simulate-payment`,
          {
            method: "POST",
            headers: getSecurityHeaders(token),
          },
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message ||
              "Failed to trigger real payment settlement",
          );
        }
        await withMinimumDelay(Promise.resolve(), 12500);
        await refreshData();
      } else {
        // Mock fallback for mock transaction
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 3000)),
          12500, // 12.5s minimum delay
        );
        if (txId) {
          setTransactions((prev) =>
            prev.map((tx) => {
              if (tx.id === txId) return { ...tx, status: "PAID" };
              return tx;
            }),
          );
          const targetTx = transactions.find((t) => t.id === txId);
          if (targetTx) {
            setProducts((prev) =>
              prev.map((p) => {
                if (p.product_id === targetTx.product_id) {
                  const updatedP = {
                    ...p,
                    status: "OWNED",
                    timeline: [
                      ...p.timeline,
                      {
                        event: "BRAND_OUTLET",
                        actor_role: "system",
                        metadata: {
                          invoice: `INV-${targetTx.id}`,
                          boutique: "Boutique Terminal Gateway",
                          tx_hash: "0x3f12...acdd",
                        },
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  };
                  setSelectedProduct(updatedP);
                  return updatedP;
                }
                return p;
              }),
            );
          }
        }
      }
    } catch (err: any) {
      showAlert(
        "Payment Settlement Failed",
        err.message || "Payment processing failed",
        "error",
      );
    } finally {
      setIsLoaderOpen(false);
    }
  };

  const handleNftTransfer = async (txId?: string) => {
    setLoaderTitle("On-Chain NFT Relayer");
    setLoaderMessage("Broadcasting gasless NFT mint to Sepolia endpoint...");
    setIsLoaderOpen(true);
    try {
      if (txId && isUuid(txId)) {
        // Real transaction — refresh status (NFT transfer is automated during payment / NFC verification)
        await withMinimumDelay(Promise.resolve(), 13500);
        await refreshData();
      } else {
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 4000)),
          13500, // 13.5s minimum delay
        );
        if (txId) {
          setTransactions((prev) =>
            prev.map((tx) => {
              if (tx.id === txId) return { ...tx, status: "COMPLETED" };
              return tx;
            }),
          );
        }
      }
    } catch (err: any) {
      showAlert(
        "NFT Relayer Failure",
        err.message || "NFT Relayer failed",
        "error",
      );
    } finally {
      setIsLoaderOpen(false);
    }
  };

  const handleNfcVerification = async (txId?: string) => {
    setLoaderTitle("NFC Proximity Check");
    setLoaderMessage(
      "Retrieving active NFC session keys & scanning physical UID...",
    );
    setIsLoaderOpen(true);
    try {
      const token = localStorage.getItem("luxtrace_token") || "";
      if (txId && isUuid(txId)) {
        // Find transaction info from state
        const targetTx = transactions.find((t) => t.id === txId);
        if (!targetTx)
          throw new Error("Transaction not found in dashboard state");

        // 1. Fetch nfc_uid from nfc-debug route
        const nfcDebugRes = await fetch(
          `/api/products/${targetTx.product_id}/nfc-debug`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const nfcDebugData = await nfcDebugRes.json();
        if (
          !nfcDebugRes.ok ||
          !nfcDebugData.success ||
          !nfcDebugData.data.nfc_uid
        ) {
          throw new Error("NFC Tag not bound to this product yet");
        }
        const scannedUid = nfcDebugData.data.nfc_uid;

        const isDirect =
          targetTx.type === "P2P_DIRECT_HANDOVER" ||
          (targetTx.type === "PRIMARY_BOUTIQUE" && !targetTx.payment_ref);
        let verifyRes;
        if (isDirect) {
          // Direct P2P verification uses the dedicated direct-verify endpoint
          verifyRes = await fetch(`/api/transactions/${txId}/direct-verify`, {
            method: "POST",
            headers: getSecurityHeaders(token),
            body: JSON.stringify({
              scanned_uid: scannedUid,
            }),
          });
        } else {
          // Remote P2P generates the active QR session then release escrow
          const qrRes = await fetch(`/api/p2p/remote/${txId}/qr`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const qrData = await qrRes.json();
          if (!qrRes.ok || !qrData.success) {
            throw new Error(
              qrData.error?.message || "Failed to generate active QR session",
            );
          }
          const sessionId = qrData.data.session_id;

          verifyRes = await fetch("/api/p2p/verify", {
            method: "POST",
            headers: getSecurityHeaders(token),
            body: JSON.stringify({
              session_id: sessionId,
              scanned_uid: scannedUid,
              mode: "remote",
            }),
          });
        }

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(
            verifyData.error?.message || "NFC verification match check failed",
          );
        }

        await withMinimumDelay(Promise.resolve(), 12000);
        await refreshData();
      } else {
        // Mock fallback
        await withMinimumDelay(
          new Promise((resolve) => setTimeout(resolve, 2000)),
          12000, // 12s minimum delay
        );
        if (txId) {
          setTransactions((prev) =>
            prev.map((tx) => {
              if (tx.id === txId) return { ...tx, status: "COMPLETED" };
              return tx;
            }),
          );
          const targetTx = transactions.find((t) => t.id === txId);
          if (targetTx) {
            setProducts((prev) =>
              prev.map((p) => {
                if (p.product_id === targetTx.product_id) {
                  const updatedP = {
                    ...p,
                    status: "OWNED",
                    timeline: [
                      ...p.timeline,
                      {
                        event: "TRANSFERRED",
                        actor_role: "CONSUMER",
                        metadata: {
                          via: targetTx.type,
                          tx_hash: "0x98f2...11ac",
                          from: p.wallet,
                          to: "0xNEW_OWNER...99b2",
                        },
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  };
                  setSelectedProduct(updatedP);
                  return updatedP;
                }
                return p;
              }),
            );
          }
        }
      }
    } catch (err: any) {
      showAlert(
        "NFC Verification Failed",
        err.message || "NFC Verification failed",
        "error",
      );
    } finally {
      setIsLoaderOpen(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoaderTitle("Bulk Registration Queue");
    setLoaderMessage("Parsing CSV and validating serial duplicates...");
    setIsLoaderOpen(true);

    try {
      const token = localStorage.getItem("luxtrace_token") || "";
      const formData = new FormData();
      formData.append("file", file);

      // Post file to upload endpoint
      const response = await fetch("/api/products/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message || result.message || "CSV upload failed",
        );
      }

      const batchId = result.data.batch_id;
      setLoaderMessage(
        `Batch submitted! Processing on Ethereum Sepolia. Polling progress...`,
      );

      // Poll batch status every 3 seconds until completed
      let isCompleted = false;
      let attempts = 0;
      while (!isCompleted && attempts < 40) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const pollRes = await fetch(`/api/products/batch/${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pollData = await pollRes.json();

        if (pollRes.ok && pollData.success) {
          const batch = pollData.data;
          setLoaderMessage(
            `Ethereum Sepolia Finality: Processing ${batch.processed} of ${batch.total_submitted} items...`,
          );

          if (batch.status === "COMPLETED" || batch.status === "FAILED") {
            isCompleted = true;
            if (batch.failed && batch.failed.length > 0) {
              const failures = batch.failed
                .map((f: any) => `${f.serial_number}: ${f.reason}`)
                .join("\n");
              showAlert(
                "Batch Registration Complete with Warnings",
                `Batch completed with some errors:\n${failures}`,
                "warning",
              );
            } else {
              showAlert(
                "Batch Registration Successful",
                `Successfully minted and registered ${batch.total_submitted} digital twins on Ethereum Sepolia!`,
                "success",
              );
            }
          }
        }
      }

      await refreshData();
    } catch (err: any) {
      showAlert(
        "CSV Upload Error",
        err.message || "Invalid CSV file format",
        "error",
      );
    } finally {
      setIsLoaderOpen(false);
      // Reset input
      e.target.value = "";
    }
  };

  // ─── FILTER PRODUCTS ───────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      productStatusFilter === "ALL" || p.status === productStatusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0A0A0A] font-sans antialiased text-[#ededed]">
      <div
        className={`fixed inset-0 bg-black/70 z-30 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      {/* ─── SIDEBAR ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-full h-screen border-r border-[#00FFB2]/8 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6 overflow-y-auto transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:w-64 lg:bg-black/40 lg:backdrop-blur-md`}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#0F2A25] to-[#00FFB2] flex items-center justify-center border border-[#00FFB2]/20 shadow-[0_0_15px_rgba(0,255,178,0.25)]">
              <span className="text-black font-dm font-bold text-sm tracking-wider">
                L
              </span>
            </div>
            <div>
              <span className="text-white font-dm font-bold tracking-widest text-lg block">
                LUXTRACE
              </span>
              <span className="text-[10px] text-[#00FFB2] uppercase tracking-[0.2em] font-mono leading-none">
                PROVENANCE v1.0
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => switchTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/3"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
                />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => switchTab("products")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === "products"
                  ? "bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/3"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span>Asset Registry</span>
            </button>

            <button
              onClick={() => switchTab("transactions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-gradient-to-r from-[#0F2A25] to-[#081C18] border border-[#00FFB2]/20 text-[#00FFB2] shadow-[0_0_15px_rgba(0,255,178,0.05)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/3"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>P2P Escrows</span>
            </button>

            <button
              onClick={() => switchTab("boutique")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-300 font-dm uppercase tracking-wider cursor-pointer ${
                activeTab === "boutique"
                  ? "bg-gradient-to-r from-[#1a0e00] to-[#120a00] border border-[#C9A84C]/30 text-[#C9A84C] shadow-[0_0_15px_rgba(201,168,76,0.08)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/3"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Boutique Sell</span>
            </button>
          </nav>
        </div>

        {/* Network & Wallet Status & Logout */}
        <div className="space-y-4">
          <div className="border border-[#00FFB2]/10 bg-black/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#00FFB2] animate-pulse"></span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                SEPOLIA GATEWAY
              </span>
            </div>
            <p
              className="text-xs text-white font-mono truncate mb-1"
              title={adminUser?.wallet_address || "0xBrand...Custody"}
            >
              {adminUser?.wallet_address
                ? `${adminUser.wallet_address.slice(0, 6)}...${adminUser.wallet_address.slice(-4)}`
                : "0xBrand...Custody"}
            </p>
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[11px] font-bold text-white truncate">
                {adminUser?.full_name || "System Operator"}
              </p>
              <p className="text-[9px] text-zinc-500 truncate">
                {adminUser?.email || "operator@luxtrace.com"}
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] text-[#00FFB2] font-mono border-t border-white/5 pt-2 mt-2">
              <span>GAS RELAYER: ACTIVE</span>
              <span className="opacity-60">12s LATENCY</span>
            </div>
            <div className="border-t border-white/5 pt-2 mt-2">
              <a
                href="https://thirdweb.com/sepolia/0x6d87293F44D68365De7cE9c29dAF752971237239"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-[9px] text-zinc-400 hover:text-[#00FFB2] font-mono transition duration-200"
              >
                <span>CONTRACT EXPLORER ↗</span>
                <span className="opacity-60">0x6d87...7239</span>
              </a>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("luxtrace_token");
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 hover:border-red-500/40 rounded-lg text-xs font-dm uppercase tracking-wider font-semibold text-red-400 hover:text-red-300 transition duration-200 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 overflow-y-auto px-4 md:px-6 lg:px-10 py-6 md:py-8 space-y-8">
        <div className="lg:hidden flex items-center mb-4 border-b border-white/10 pb-4 px-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/70 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#00FFB2]/50 transition"
            aria-label="Open sidebar menu"
          >
            <span className="sr-only">Open menu</span>
            <span className="block h-0.5 w-6 rounded-full bg-white"></span>
            <span className="block h-0.5 w-6 rounded-full bg-white mt-1"></span>
            <span className="block h-0.5 w-6 rounded-full bg-white mt-1"></span>
          </button>
        </div>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold font-dm uppercase tracking-wider text-white">
              {activeTab === "dashboard" && "System Operations"}
              {activeTab === "products" && "Asset Registry"}
              {activeTab === "transactions" && "P2P Escrow Manager"}
              {activeTab === "boutique" && "Boutique Sale Terminal"}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {activeTab === "dashboard" &&
                "Real-time status of physical NFC-bound luxury assets on Sepolia Ethereum"}
              {activeTab === "products" &&
                "Trace, audit, and inspect digital twins registered in the smart contract"}
              {activeTab === "transactions" &&
                "Inspect Midtrans invoices and release funds upon hardware proximity scan"}
              {activeTab === "boutique" &&
                "Select a product and buyer — generate QR payment link for in-store scanning"}
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search Serial / Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-[#00FFB2]/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-[#00FFB2] transition duration-300 font-sans"
              />
              <svg
                className="w-4 h-4 absolute right-3 top-2.5 text-zinc-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="glow-btn px-5 py-2 rounded-lg text-xs font-dm uppercase tracking-wider font-semibold cursor-pointer"
            >
              Mint New Twin
            </button>
          </div>
        </div>

        {/* ─── TAB CONTENT: DASHBOARD ───────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-[#00FFB2] font-mono uppercase tracking-widest block mb-2">
                  Total Registered Twins
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {totalTwins}
                  </span>
                  <span className="text-xs text-[#00FFB2] font-mono leading-none">
                    Active Twins
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  100% on-chain Sepolia NFT proof
                </p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">
                  Escrow Locked Volume
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-dm text-white">
                    {formatVolume(lockedVolumeVal)}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono leading-none">
                    {activeEscrowsCount} escrows
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  Midtrans transaction hold state
                </p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#00FFB2]/2 rounded-full blur-2xl group-hover:bg-[#00FFB2]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">
                  P2P Handover Sessions
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {activeHandoversCount}
                  </span>
                  <span className="text-xs text-[#00FFB2] font-mono leading-none">
                    Active Sessions
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  5-minute active TTL verification
                </p>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden border-[#ff3e3e]/20 group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#ff3e3e]/2 rounded-full blur-2xl group-hover:bg-[#ff3e3e]/5 transition-all duration-500"></div>
                <span className="text-[10px] text-[#ff3e3e] font-mono uppercase tracking-widest block mb-2">
                  NFC Fraud Incidents
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    0
                  </span>
                  <span className="text-xs text-emerald-400 font-mono leading-none">
                    Secured
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                  Real-time hardware check matching
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="luxury-card rounded-xl p-6 col-span-1 xl:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                      Verification Throughput
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                      Sepolia blockchain transaction latency trends
                    </p>
                  </div>
                  <div className="flex gap-4 text-[9px] font-mono text-[#00FFB2]">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FFB2]"></span>
                      <span>Primary Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                      <span>P2P Transfers</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 relative">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 600 240"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="areaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#00FFB2"
                          stopOpacity="0.15"
                        />
                        <stop
                          offset="100%"
                          stopColor="#00FFB2"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <line
                      x1="0"
                      y1="40"
                      x2="600"
                      y2="40"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="90"
                      x2="600"
                      y2="90"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="140"
                      x2="600"
                      y2="140"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="190"
                      x2="600"
                      y2="190"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />

                    <path
                      d="M 0 190 L 100 170 L 200 110 L 300 150 L 400 80 L 500 120 L 600 60 L 600 210 L 0 210 Z"
                      fill="url(#areaGradient)"
                    />
                    <path
                      d="M 0 190 L 100 170 L 200 110 L 300 150 L 400 80 L 500 120 L 600 60"
                      stroke="#00FFB2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter:
                          "drop-shadow(0px 0px 8px rgba(0, 255, 178, 0.5))",
                      }}
                    />

                    <circle
                      cx="200"
                      cy="110"
                      r="4"
                      fill="#00FFB2"
                      stroke="#0A0A0A"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="400"
                      cy="80"
                      r="4"
                      fill="#00FFB2"
                      stroke="#0A0A0A"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="600"
                      cy="60"
                      r="4"
                      fill="#00FFB2"
                      stroke="#0A0A0A"
                      strokeWidth="1.5"
                    />

                    <text
                      x="180"
                      y="95"
                      fill="white"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      15.2s (Peak)
                    </text>
                    <text
                      x="385"
                      y="65"
                      fill="white"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      12.0s (Min)
                    </text>
                  </svg>
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-2 px-1">
                    <span>00:00 AM</span>
                    <span>04:00 AM</span>
                    <span>08:00 AM</span>
                    <span>12:00 PM</span>
                    <span>04:00 PM</span>
                    <span>08:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                    Security Integrity
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Percentage match rate of hardware tags
                  </p>
                </div>

                <div className="flex justify-center items-center py-4 relative">
                  <svg className="w-36 h-36" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#00FFB2"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset="12.5"
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{
                        filter:
                          "drop-shadow(0px 0px 5px rgba(0, 255, 178, 0.4))",
                      }}
                    />
                    <text
                      x="50"
                      y="55"
                      textAnchor="middle"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      95%
                    </text>
                  </svg>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>TRUST SCORE:</span>
                    <span className="text-[#00FFB2] font-semibold">
                      AAA SECURITY
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split view: operations list & timeline */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Operations list */}
              <div className="luxury-card rounded-xl p-6 col-span-1 xl:col-span-3 h-fit self-start">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                      Twin Transactions
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                      Live off-chain invoice locks & digital signature states
                    </p>
                  </div>
                  <span className="text-[9px] text-[#00FFB2] font-mono bg-[#00FFB2]/5 px-2.5 py-1 border border-[#00FFB2]/10 rounded-full">
                    {
                      transactions.filter((t) => t.status !== "COMPLETED")
                        .length
                    }{" "}
                    ACTIVE ESCROWS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                        <th className="py-3 px-2">TX ID</th>
                        <th className="py-3 px-2">Twin Model</th>
                        <th className="py-3 px-2">Transfer Type</th>
                        <th className="py-3 px-2 text-right">Value</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions
                        .slice(
                          (dashboardPage - 1) * ITEMS_PER_PAGE,
                          dashboardPage * ITEMS_PER_PAGE,
                        )
                        .map((tx) => (
                          <tr
                            key={tx.id}
                            className="hover:bg-white/2 cursor-pointer transition duration-150 group"
                            onClick={() => {
                              const matched = products.find(
                                (p) => p.product_id === tx.product_id,
                              );
                              if (matched) setSelectedProduct(matched);
                            }}
                          >
                            <td className="py-4 px-2 font-mono text-[#00FFB2]">
                              {tx.id}
                            </td>
                            <td className="py-4 px-2 text-white font-medium group-hover:text-[#00FFB2] transition duration-200">
                              <span className="block font-dm text-sm leading-none mb-1">
                                {tx.product}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {tx.serial}
                              </span>
                            </td>
                            <td className="py-4 px-2 font-mono text-[10px] text-zinc-400">
                              {tx.type}
                            </td>
                            <td className="py-4 px-2 text-right font-mono font-medium">
                              {tx.amount}
                            </td>
                            <td className="py-4 px-2 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                                  tx.status === "COMPLETED"
                                    ? "bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]"
                                    : tx.status === "IN_TRANSIT"
                                      ? "bg-amber-400/5 border-amber-400/15 text-amber-400"
                                      : tx.status === "PAID"
                                        ? "bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]"
                                        : "bg-zinc-400/5 border-zinc-400/15 text-zinc-400"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {transactions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                      Showing{" "}
                      {Math.min(
                        transactions.length,
                        (dashboardPage - 1) * ITEMS_PER_PAGE + 1,
                      )}
                      -
                      {Math.min(
                        transactions.length,
                        dashboardPage * ITEMS_PER_PAGE,
                      )}{" "}
                      of {transactions.length} items
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={dashboardPage === 1}
                        onClick={() => setDashboardPage((prev) => prev - 1)}
                        className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        disabled={
                          dashboardPage >=
                          Math.ceil(transactions.length / ITEMS_PER_PAGE)
                        }
                        onClick={() => setDashboardPage((prev) => prev + 1)}
                        className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Provenance Explorer */}
              <div className="luxury-card rounded-xl p-6 col-span-2">
                <div className="mb-6">
                  <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                    Provenance Explorer
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Trace digital twin lifecycles from manufacture to ownership
                  </p>
                </div>

                {!selectedProduct ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border border-dashed border-[#00FFB2]/20 flex items-center justify-center text-zinc-600">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">
                      No active digital twins selected
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
                        Select Active Asset Twin
                      </label>
                      <select
                        className="w-full bg-black/40 border border-[#00FFB2]/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00FFB2] text-white"
                        value={selectedProduct.product_id}
                        onChange={(e) => {
                          const matched = products.find(
                            (p) => p.product_id === e.target.value,
                          );
                          if (matched) setSelectedProduct(matched);
                        }}
                      >
                        {products.map((p) => (
                          <option
                            key={p.product_id}
                            value={p.product_id}
                            className="bg-[#0A0A0A] text-white"
                          >
                            [{p.serial_number}] {p.brand} {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border border-white/5 bg-black/20 rounded-lg p-3.5 mb-6 text-xs relative overflow-hidden">
                      <div className="absolute right-3 top-3 px-2 py-0.5 bg-[#00FFB2]/5 border border-[#00FFB2]/10 rounded text-[9px] text-[#00FFB2] font-mono">
                        NFT ID: #{selectedProduct.nft_token_id || "PENDING"}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {selectedProduct.brand}
                      </p>
                      <h4 className="font-dm font-bold text-sm text-white mt-0.5 uppercase tracking-wide">
                        {selectedProduct.name}
                      </h4>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-3 border-t border-white/5 pt-2">
                        <span>OWNER WALLET:</span>
                        <span className="text-white hover:text-[#00FFB2] cursor-pointer font-mono">
                          {selectedProduct.wallet}
                        </span>
                      </div>
                    </div>

                    {/* Timeline display */}
                    <div className="relative pl-6 border-l border-[#00FFB2]/10 space-y-6">
                      {selectedProduct.timeline &&
                        selectedProduct.timeline.map(
                          (log: any, index: number) => {
                            const isLast =
                              index === selectedProduct.timeline.length - 1;
                            return (
                              <div key={index} className="relative">
                                <span
                                  className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${
                                    isLast
                                      ? "bg-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.5)]"
                                      : "bg-zinc-800"
                                  }`}
                                >
                                  {isLast && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                  )}
                                </span>

                                <div>
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span
                                      className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${
                                        isLast ? "text-[#00FFB2]" : "text-white"
                                      }`}
                                    >
                                      {log.event}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                      {new Date(
                                        log.timestamp,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono">
                                      <span>ACTOR: {log.actor_role}</span>
                                    </div>
                                    {log.metadata &&
                                      Object.entries(log.metadata).map(
                                        ([key, value]) => (
                                          <div
                                            key={key}
                                            className="flex justify-between font-mono"
                                          >
                                            <span className="uppercase opacity-60 text-[9px]">
                                              {key.replace("_", " ")}:
                                            </span>
                                            <span className="text-white truncate max-w-[150px]">
                                              {String(value)}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: ASSET REGISTRY ──────────────────────────────────────── */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Products registry list (2/3 columns) */}
            <div className="luxury-card rounded-xl p-6 col-span-1 xl:col-span-2 space-y-6 h-fit self-start">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white">
                    Registered Twins
                  </h3>
                  <div className="flex gap-2">
                    <a
                      href="/sample_products.csv"
                      download
                      className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-white/5 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer transition duration-200"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                      <span>Template</span>
                    </a>

                    <label className="flex items-center gap-2 px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#0F2A25]/50 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded-lg text-[10px] font-mono text-[#00FFB2] cursor-pointer transition duration-200">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span>Mint (CSV)</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Status Filter Tab */}
                <div className="flex border border-white/5 rounded-lg overflow-hidden bg-black/40">
                  {[
                    "ALL",
                    "MANUFACTURED",
                    "REGISTERED",
                    "OWNED",
                    "IN_TRANSIT",
                  ].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setProductStatusFilter(filter)}
                      className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer transition ${
                        productStatusFilter === filter
                          ? "bg-[#00FFB2]/10 text-[#00FFB2] border-r border-white/5"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {filter.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      <th className="py-3 px-2">Twin Model</th>
                      <th className="py-3 px-2">Serial Number</th>
                      <th className="py-3 px-2">NFT Token ID</th>
                      <th className="py-3 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts
                      .slice(
                        (productsPage - 1) * ITEMS_PER_PAGE,
                        productsPage * ITEMS_PER_PAGE,
                      )
                      .map((p) => (
                        <tr
                          key={p.product_id}
                          onClick={() => setSelectedProduct(p)}
                          className={`hover:bg-white/2 cursor-pointer transition duration-150 ${
                            selectedProduct &&
                            selectedProduct.product_id === p.product_id
                              ? "bg-white/2 border-l border-[#00FFB2]"
                              : ""
                          }`}
                        >
                          <td className="py-4 px-2 text-white font-medium">
                            <span className="block font-dm text-sm leading-none mb-1">
                              {p.brand}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {p.name}
                            </span>
                          </td>
                          <td className="py-4 px-2 font-mono text-zinc-400">
                            {p.serial_number}
                          </td>
                          <td className="py-4 px-2 font-mono text-[#00FFB2]">
                            {p.nft_token_id ? `#${p.nft_token_id}` : "UNMINTED"}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                                p.status === "OWNED"
                                  ? "bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]"
                                  : p.status === "IN_TRANSIT"
                                    ? "bg-amber-400/5 border-amber-400/15 text-amber-400"
                                    : p.status === "REGISTERED"
                                      ? "bg-blue-400/5 border-blue-400/15 text-blue-400"
                                      : "bg-zinc-400/5 border-zinc-400/15 text-zinc-400"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    Showing{" "}
                    {Math.min(
                      filteredProducts.length,
                      (productsPage - 1) * ITEMS_PER_PAGE + 1,
                    )}
                    -
                    {Math.min(
                      filteredProducts.length,
                      productsPage * ITEMS_PER_PAGE,
                    )}{" "}
                    of {filteredProducts.length} items
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={productsPage === 1}
                      onClick={() => setProductsPage((prev) => prev - 1)}
                      className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      disabled={
                        productsPage >=
                        Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
                      }
                      onClick={() => setProductsPage((prev) => prev + 1)}
                      className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product Twin detailed properties inspection (1/3 columns) */}
            <div className="space-y-6">
              {!selectedProduct ? (
                <div className="luxury-card rounded-xl p-6 text-center py-12">
                  <p className="text-xs text-zinc-500 font-mono">
                    No product selected
                  </p>
                </div>
              ) : (
                <>
                  <div className="luxury-card rounded-xl p-6 space-y-6">
                    <div>
                      <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-zinc-400">
                        Twin Properties
                      </h3>
                      <h2 className="text-lg font-bold font-dm text-white mt-1 uppercase tracking-wide">
                        {selectedProduct.brand} {selectedProduct.name}
                      </h2>
                    </div>

                    <div className="space-y-4 text-xs border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">
                          ID:
                        </span>
                        <span className="text-white">
                          {selectedProduct.product_id}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">
                          Serial Number:
                        </span>
                        <span className="text-white">
                          {selectedProduct.serial_number}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">
                          Status:
                        </span>
                        <span className="text-[#00FFB2]">
                          {selectedProduct.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">
                          NFT Token ID:
                        </span>
                        <span className="text-white hover:underline cursor-pointer">
                          {selectedProduct.nft_token_id
                            ? `#${selectedProduct.nft_token_id}`
                            : "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono">
                        <span className="text-zinc-500 uppercase text-[9px]">
                          Current Custody:
                        </span>
                        <span
                          className="text-white truncate max-w-[130px]"
                          title={selectedProduct.wallet}
                        >
                          {selectedProduct.wallet}
                        </span>
                      </div>

                      {selectedProductNfcUid && (
                        <div className="flex justify-between items-center font-mono border-t border-white/5 pt-3">
                          <span className="text-zinc-500 uppercase text-[9px]">
                            NFC UID:
                          </span>
                          <span
                            className="text-[#00FFB2] cursor-pointer hover:underline"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedProductNfcUid,
                              );
                              alert("NFC UID copied to clipboard!");
                            }}
                            title="Click to copy NFC UID"
                          >
                            {selectedProductNfcUid}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Provenance timeline on the same products view */}
                  <div className="luxury-card rounded-xl p-6">
                    <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white mb-6">
                      Off-Chain Log Audits
                    </h3>

                    <div className="relative pl-6 border-l border-[#00FFB2]/10 space-y-6">
                      {selectedProduct.timeline &&
                        selectedProduct.timeline.map(
                          (log: any, index: number) => {
                            const isLast =
                              index === selectedProduct.timeline.length - 1;
                            return (
                              <div key={index} className="relative">
                                <span
                                  className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center ${
                                    isLast
                                      ? "bg-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.5)]"
                                      : "bg-zinc-800"
                                  }`}
                                >
                                  {isLast && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                  )}
                                </span>

                                <div>
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span
                                      className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${
                                        isLast ? "text-[#00FFB2]" : "text-white"
                                      }`}
                                    >
                                      {log.event}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-mono">
                                      {new Date(
                                        log.timestamp,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] text-zinc-400 space-y-1">
                                    <div className="flex justify-between text-[9px] font-mono">
                                      <span>ACTOR: {log.actor_role}</span>
                                    </div>
                                    {log.metadata &&
                                      Object.entries(log.metadata).map(
                                        ([key, value]) => (
                                          <div
                                            key={key}
                                            className="flex justify-between font-mono"
                                          >
                                            <span className="uppercase opacity-60 text-[9px]">
                                              {key.replace("_", " ")}:
                                            </span>
                                            <span className="text-white truncate max-w-[150px]">
                                              {String(value)}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: P2P ESCROWS ────────────────────────────────────────── */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            {/* Escrow summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">
                  Escrows Awaiting Verification
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {
                      transactions.filter(
                        (t) => t.status === "PAID" || t.status === "IN_TRANSIT",
                      ).length
                    }
                  </span>
                  <span className="text-xs text-amber-400 font-mono">
                    Active lock
                  </span>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">
                  Completed Escrow Payouts
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {
                      transactions.filter((t) => t.status === "COMPLETED")
                        .length
                    }
                  </span>
                  <span className="text-xs text-[#00FFB2] font-mono">
                    Settled
                  </span>
                </div>
              </div>

              <div className="luxury-card rounded-xl p-5 relative overflow-hidden">
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block mb-2">
                  Awaiting Buyer Deposit
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-dm text-white">
                    {transactions.filter((t) => t.status === "PENDING").length}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    Invoices open
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow operations table */}
            <div className="luxury-card rounded-xl p-6">
              <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white mb-6">
                P2P Escrow Ledger
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      <th className="py-3 px-2">Tx ID</th>
                      <th className="py-3 px-2">Product Details</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2 text-right">Value</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">
                        Operational Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions
                      .slice(
                        (escrowsPage - 1) * ITEMS_PER_PAGE,
                        escrowsPage * ITEMS_PER_PAGE,
                      )
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/2 transition">
                          <td className="py-4 px-2 font-mono text-[#00FFB2]">
                            {tx.id}
                          </td>
                          <td className="py-4 px-2 text-white font-medium">
                            <span className="block font-dm text-sm leading-none mb-1">
                              {tx.product}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {tx.serial}
                            </span>
                          </td>
                          <td className="py-4 px-2 font-mono text-zinc-400 text-[10px]">
                            {tx.type}
                          </td>
                          <td className="py-4 px-2 text-right font-mono font-medium">
                            {tx.amount}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono tracking-widest uppercase border ${
                                tx.status === "COMPLETED"
                                  ? "bg-[#00FFB2]/5 border-[#00FFB2]/15 text-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.05)]"
                                  : tx.status === "IN_TRANSIT"
                                    ? "bg-amber-400/5 border-amber-400/15 text-amber-400"
                                    : tx.status === "PAID"
                                      ? "bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]"
                                      : "bg-zinc-400/5 border-zinc-400/15 text-zinc-400"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button
                                onClick={() => handleInspectTransaction(tx.id)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 rounded text-[9px] font-mono text-zinc-300 transition uppercase tracking-wider cursor-pointer"
                              >
                                Inspect Details
                              </button>

                              {tx.status === "PENDING" &&
                                (tx.type === "P2P_DIRECT_HANDOVER" ||
                                (tx.type === "PRIMARY_BOUTIQUE" &&
                                  !tx.payment_ref) ? (
                                  <button
                                    onClick={() => handleNfcVerification(tx.id)}
                                    className="px-3 py-1.5 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 hover:border-amber-400/40 rounded text-[9px] font-mono text-amber-400 transition uppercase tracking-wider cursor-pointer"
                                  >
                                    NFC Handover
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handlePaymentSuccess(tx.id)}
                                    className="px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded text-[9px] font-mono text-[#00FFB2] transition uppercase tracking-wider cursor-pointer"
                                  >
                                    Trigger Pay
                                  </button>
                                ))}

                              {tx.status === "PAID" && (
                                <button
                                  onClick={() => handleNftTransfer(tx.id)}
                                  className="px-3 py-1.5 bg-[#0F2A25]/30 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/20 hover:border-[#00FFB2]/40 rounded text-[9px] font-mono text-[#00FFB2] transition uppercase tracking-wider cursor-pointer"
                                >
                                  Release NFT
                                </button>
                              )}

                              {tx.status === "IN_TRANSIT" && (
                                <button
                                  onClick={() => handleNfcVerification(tx.id)}
                                  className="px-3 py-1.5 bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 hover:border-amber-400/40 rounded text-[9px] font-mono text-amber-400 transition uppercase tracking-wider cursor-pointer"
                                >
                                  NFC Close
                                </button>
                              )}

                              {tx.status === "COMPLETED" && (
                                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest pl-2">
                                  Audited
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {transactions.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    Showing{" "}
                    {Math.min(
                      transactions.length,
                      (escrowsPage - 1) * ITEMS_PER_PAGE + 1,
                    )}
                    -
                    {Math.min(
                      transactions.length,
                      escrowsPage * ITEMS_PER_PAGE,
                    )}{" "}
                    of {transactions.length} items
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={escrowsPage === 1}
                      onClick={() => setEscrowsPage((prev) => prev - 1)}
                      className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      disabled={
                        escrowsPage >=
                        Math.ceil(transactions.length / ITEMS_PER_PAGE)
                      }
                      onClick={() => setEscrowsPage((prev) => prev + 1)}
                      className="px-3 py-1 bg-black/40 hover:bg-[#00FFB2]/10 border border-[#00FFB2]/10 hover:border-[#00FFB2]/30 disabled:border-white/5 disabled:hover:bg-transparent disabled:opacity-30 rounded text-[9px] font-mono text-[#00FFB2] disabled:text-zinc-500 transition uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB CONTENT: BOUTIQUE SELL ─────────────────────────────────────────── */}
        {activeTab === "boutique" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Step 1: Select Product */}
            <div className="luxury-card rounded-xl p-6">
              <div className="mb-5">
                <span className="text-[10px] text-[#C9A84C] font-mono uppercase tracking-widest block mb-1">
                  STEP 1 · SELECT PRODUCT
                </span>
                <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white">
                  Boutique Inventory
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Choose a REGISTERED luxury item from the boutique stock.
                </p>
              </div>

              {selectedBoutiqueProduct ? (
                <div>
                  <div className="bg-black/40 border border-[#C9A84C]/20 rounded-lg p-4 mb-3 flex justify-between items-center">
                    <div>
                      <span className="text-[#C9A84C] text-[9px] font-mono uppercase tracking-widest block mb-1">
                        {selectedBoutiqueProduct.brand}
                      </span>
                      <span className="text-white font-dm font-bold text-sm block">
                        {selectedBoutiqueProduct.name}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-mono">
                        {selectedBoutiqueProduct.serial_number}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-mono font-bold text-sm block">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(selectedBoutiqueProduct.price_idr)}
                      </span>
                      <button
                        onClick={() => setSelectedBoutiqueProduct(null)}
                        className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-wider mt-2 cursor-pointer transition"
                      >
                        Change →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search by brand, name, serial..."
                      value={boutiqueSearch}
                      onChange={(e) => setBoutiqueSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#C9A84C]/50 transition duration-300 font-sans text-white placeholder-zinc-600"
                    />
                    <svg
                      className="w-4 h-4 absolute right-3 top-2.5 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  {isBoutiqueLoadingProducts ? (
                    <div className="flex items-center gap-3 py-6 text-zinc-500 text-xs font-mono">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Loading boutique inventory...
                    </div>
                  ) : boutiqueProducts.filter(
                      (p) =>
                        !boutiqueSearch ||
                        p.brand
                          ?.toLowerCase()
                          .includes(boutiqueSearch.toLowerCase()) ||
                        p.name
                          ?.toLowerCase()
                          .includes(boutiqueSearch.toLowerCase()) ||
                        p.serial_number
                          ?.toLowerCase()
                          .includes(boutiqueSearch.toLowerCase()),
                    ).length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-zinc-500 text-xs font-mono">
                        No REGISTERED products available.
                      </p>
                      <p className="text-zinc-600 text-[10px] font-mono mt-1">
                        Activate manufactured items first via the Asset
                        Registry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {boutiqueProducts
                        .filter(
                          (p) =>
                            !boutiqueSearch ||
                            p.brand
                              ?.toLowerCase()
                              .includes(boutiqueSearch.toLowerCase()) ||
                            p.name
                              ?.toLowerCase()
                              .includes(boutiqueSearch.toLowerCase()) ||
                            p.serial_number
                              ?.toLowerCase()
                              .includes(boutiqueSearch.toLowerCase()),
                        )
                        .map((p: any) => (
                          <button
                            key={p.product_id}
                            onClick={() => setSelectedBoutiqueProduct(p)}
                            className="w-full bg-black/30 hover:bg-[#C9A84C]/5 border border-white/5 hover:border-[#C9A84C]/20 rounded-lg p-3.5 text-left transition duration-200 cursor-pointer flex justify-between items-center group"
                          >
                            <div>
                              <span className="text-[#C9A84C] text-[9px] font-mono uppercase tracking-widest block">
                                {p.brand}
                              </span>
                              <span className="text-white text-xs font-dm font-semibold group-hover:text-[#C9A84C] transition">
                                {p.name}
                              </span>
                              <span className="text-zinc-500 text-[9px] font-mono block mt-0.5">
                                {p.serial_number}
                              </span>
                            </div>
                            <span className="text-zinc-300 text-xs font-mono font-semibold">
                              {new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              }).format(p.price_idr)}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Select Transaction Mode */}
            <div className="luxury-card rounded-xl p-6">
              <div className="mb-5">
                <span className="text-[10px] text-[#C9A84C] font-mono uppercase tracking-widest block mb-1">
                  STEP 2 · TRANSACTION MODE
                </span>
                <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white">
                  Boutique Sale Mode
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Choose how the buyer wishes to settle the purchase and receive
                  the asset.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBoutiqueSaleMode("escrow")}
                  className={`border rounded-xl p-4 text-left transition duration-300 cursor-pointer flex flex-col justify-between h-28 ${
                    boutiqueSaleMode === "escrow"
                      ? "border-[#C9A84C] bg-[#C9A84C]/5 text-white"
                      : "border-white/5 bg-black/40 hover:border-white/10 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold font-dm uppercase tracking-wider block">
                      Escrow P2P
                    </span>
                  </div>
                  <p className="text-[9px] font-mono leading-normal text-zinc-500 mt-1">
                    Buyer pays via Midtrans QR in-store. NFT is transferred
                    after settlement.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBoutiqueSaleMode("direct")}
                  className={`border rounded-xl p-4 text-left transition duration-300 cursor-pointer flex flex-col justify-between h-28 ${
                    boutiqueSaleMode === "direct"
                      ? "border-[#C9A84C] bg-[#C9A84C]/5 text-white"
                      : "border-white/5 bg-black/40 hover:border-white/10 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold font-dm uppercase tracking-wider block">
                      Direct P2P
                    </span>
                  </div>
                  <p className="text-[9px] font-mono leading-normal text-zinc-500 mt-1">
                    Offline payment (cash/card). Buyer scans QR in mobile app
                    and taps NFC immediately.
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Buyer Email */}
            <div className="luxury-card rounded-xl p-6">
              <div className="mb-5">
                <span className="text-[10px] text-[#C9A84C] font-mono uppercase tracking-widest block mb-1">
                  STEP 3 · BUYER INFORMATION
                </span>
                <h3 className="text-sm font-bold font-dm uppercase tracking-widest text-white">
                  Buyer Email Address
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Buyer must have an active Luxtrace account. Enter their
                  registered email.
                </p>
              </div>
              <input
                type="email"
                id="boutique-buyer-email"
                placeholder="buyer@example.com"
                value={boutiqueBuyerEmail}
                onChange={(e) => setBoutiqueBuyerEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-[#C9A84C]/50 rounded-lg px-4 py-3 text-sm font-sans text-white placeholder-zinc-600 focus:outline-none transition duration-300"
              />
            </div>

            {/* Submit */}
            <button
              id="boutique-initiate-sale-btn"
              onClick={handleInitiateBoutiqueSale}
              disabled={
                !selectedBoutiqueProduct ||
                !boutiqueBuyerEmail ||
                isBoutiqueSubmitting
              }
              className={`w-full h-12 rounded-xl text-sm font-dm font-bold uppercase tracking-wider transition duration-200 cursor-pointer ${
                !selectedBoutiqueProduct ||
                !boutiqueBuyerEmail ||
                isBoutiqueSubmitting
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-40"
                  : "bg-[#C9A84C] hover:bg-[#d4b055] text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)]"
              }`}
            >
              {isBoutiqueSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : boutiqueSaleMode === "direct" ? (
                "🤝 Generate Handover QR Code"
              ) : (
                "🏛️ Generate QR Payment Link"
              )}
            </button>

            <p className="text-center text-[10px] text-zinc-600 font-mono">
              {boutiqueSaleMode === "direct"
                ? "After submission, a QR code will appear for the buyer to scan & trigger direct handover in their Luxtrace mobile app."
                : "After submission, a QR code will appear for the buyer to scan & pay in-store via Midtrans."}
            </p>
          </div>
        )}
      </main>

      {/* Hidden file input for global CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCsvUpload}
        className="hidden"
      />

      {/* ─── TRANSACTION DETAILS INSPECTOR MODAL ─────────────────────────────────── */}
      {selectedTxDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="relative bg-[#0D0D0D] border border-[#00FFB2]/20 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,255,178,0.1)]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40">
              <div>
                <span className="text-[10px] text-[#00FFB2] font-mono uppercase tracking-[0.2em] block mb-1">
                  Ledger Transaction Entry
                </span>
                <h2 className="text-sm font-bold font-dm text-white tracking-wide uppercase">
                  Inspect Tx:{" "}
                  <span className="font-mono text-[#00FFB2]">
                    {selectedTxDetail.transaction_id}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Primary Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                    Transaction Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase border ${
                      selectedTxDetail.status === "COMPLETED"
                        ? "bg-[#00FFB2]/5 border-[#00FFB2]/20 text-[#00FFB2]"
                        : selectedTxDetail.status === "PAID" ||
                            selectedTxDetail.status === "IN_TRANSIT"
                          ? "bg-amber-400/5 border-amber-400/20 text-amber-400"
                          : "bg-zinc-400/5 border-zinc-400/15 text-zinc-400"
                    }`}
                  >
                    {selectedTxDetail.status}
                  </span>
                </div>
                <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                    Amount Escrowed
                  </span>
                  <span className="text-white font-mono font-medium text-sm">
                    Rp {selectedTxDetail.amount_idr?.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                    Transaction Type
                  </span>
                  <span className="text-white font-mono text-[11px] block truncate">
                    {selectedTxDetail.type}
                  </span>
                </div>
                <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                    Created At
                  </span>
                  <span className="text-white font-mono text-[11px]">
                    {new Date(selectedTxDetail.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Handover or Payment QR Code display */}
              {txQrDataUrl ? (
                selectedTxDetail.type === "P2P_REMOTE_SHIPPING" &&
                selectedTxDetail.status === "PENDING" ? (
                  <div className="border border-[#C9A84C]/25 bg-gradient-to-b from-[#14120D] to-[#0D0D0D] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mb-3">
                      <svg
                        className="w-5 h-5 text-[#C9A84C]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-xs font-bold font-dm text-[#C9A84C] tracking-widest uppercase mb-1">
                      MIDTRANS ESCROW PAYMENT QR
                    </h4>
                    <p className="text-[10px] text-zinc-400 max-w-sm mb-5 leading-relaxed">
                      Scan this QR code using the buyer's camera or use the link
                      below to pay and deposit the funds into escrow.
                    </p>

                    <div className="bg-white p-3.5 rounded-xl shadow-lg border border-[#C9A84C]/25 mb-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={txQrDataUrl}
                        alt="Midtrans Payment QR"
                        className="w-[180px] h-[180px] object-contain"
                      />
                    </div>

                    {selectedTxDetail.payment_url && (
                      <a
                        href={selectedTxDetail.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#d4b055] text-[#0A0A0A] font-mono text-[9px] rounded-xl font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(201,168,76,0.2)] transition cursor-pointer"
                      >
                        Open Midtrans Checkout ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="border border-[#00FFB2]/20 bg-gradient-to-b from-[#0D1614] to-[#0A0A0A] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 flex items-center justify-center mb-3">
                      <svg
                        className="w-5 h-5 text-[#00FFB2]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-xs font-bold font-dm text-white tracking-widest uppercase mb-1">
                      PROXIMITY HANDOVER QR
                    </h4>
                    <p className="text-[10px] text-zinc-400 max-w-sm mb-5 leading-relaxed">
                      Scan this QR code using the buyer's Luxtrace app during
                      physical proximity checks to verify the product's NFC tag.
                    </p>

                    <div className="bg-white p-3.5 rounded-xl shadow-lg border border-[#00FFB2]/20 mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={txQrDataUrl}
                        alt="Handover QR Code"
                        className="w-[180px] h-[180px] object-contain"
                      />
                    </div>

                    <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-[#00FFB2]/25 font-mono text-[9px] text-[#00FFB2]">
                      SESSION ENABLED
                    </div>
                  </div>
                )
              ) : isLoadingTxQr ? (
                <div className="border border-[#00FFB2]/20 bg-white/2 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 border-2 border-[#00FFB2] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-xs text-zinc-400 font-mono">
                    Initializing QR Handover Session...
                  </span>
                </div>
              ) : (
                <div className="border border-white/5 bg-white/2 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <svg
                    className="w-8 h-8 text-zinc-600 mb-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  <h4 className="text-xs font-bold font-dm text-zinc-400 tracking-widest uppercase mb-1">
                    NO HANDOVER QR AVAILABLE
                  </h4>
                  <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    {selectedTxDetail.status === "PENDING" &&
                    selectedTxDetail.type === "P2P_REMOTE_SHIPPING"
                      ? "Awaiting deposit from the buyer. Handover QR becomes available once escrow is paid."
                      : "This transaction is not in a state that requires a physical handover QR verification."}
                  </p>
                </div>
              )}

              {/* Product Specifications Section */}
              {selectedTxDetail.product && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                    Asset Twin Specifications
                  </h3>
                  <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-4">
                    <div>
                      <span className="text-[9px] text-[#00FFB2] font-mono uppercase tracking-wider block mb-1">
                        {selectedTxDetail.product.brand}
                      </span>
                      <span className="text-white text-base font-bold font-dm">
                        {selectedTxDetail.product.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block">
                          Serial Number
                        </span>
                        <span className="text-zinc-300 font-mono text-[11px]">
                          {selectedTxDetail.product.serial_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block">
                          NFT Token ID
                        </span>
                        <span className="text-zinc-300 font-mono text-[11px]">
                          {selectedTxDetail.product.nft_token_id
                            ? `#${selectedTxDetail.product.nft_token_id}`
                            : "MINT PENDING"}
                        </span>
                      </div>
                    </div>
                    {selectedProductNfcUid && (
                      <div className="border-t border-white/5 pt-3 flex justify-between items-center font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
                            Bound NFC UID (Demo Copy)
                          </span>
                          <span
                            className="text-[#00FFB2] text-[11px] cursor-pointer hover:underline"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedProductNfcUid,
                              );
                              alert("NFC UID copied to clipboard!");
                            }}
                            title="Click to copy NFC UID"
                          >
                            {selectedProductNfcUid}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Participant Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-dm uppercase tracking-widest text-white">
                  Participants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                      Seller ID
                    </span>
                    <span className="text-white font-mono text-[10px] block truncate">
                      {selectedTxDetail.seller_id || "BRAND BOUTIQUE"}
                    </span>
                  </div>
                  <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
                      Buyer ID
                    </span>
                    <span className="text-white font-mono text-[10px] block truncate">
                      {selectedTxDetail.buyer_id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="px-5 py-2 bg-zinc-850 hover:bg-zinc-800 text-white font-mono text-xs rounded-xl border border-white/5 hover:border-white/10 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QR CODE PAYMENT MODAL ─────────────────────────────────────────────── */}
      {qrModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="relative bg-[#0D0D0D] border border-[#C9A84C]/20 rounded-2xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(201,168,76,0.15)]">
            {/* Close button */}
            <button
              onClick={() => {
                setQrModal({ isOpen: false, qrDataUrl: "", saleResult: null });
                resetBoutiqueSale();
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-[#C9A84C]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-[#C9A84C] text-[10px] font-mono uppercase tracking-[3px] mb-1">
                {qrModal.saleResult?.sale_mode === "direct"
                  ? "Direct Handover"
                  : "Sale Initiated"}
              </p>
              <h2 className="text-white text-lg font-dm font-bold uppercase tracking-wide">
                {qrModal.saleResult?.sale_mode === "direct"
                  ? "Handover QR Code"
                  : "Payment QR Code"}
              </h2>
              <p className="text-zinc-400 text-xs font-mono mt-1">
                {qrModal.saleResult?.sale_mode === "direct"
                  ? "Buyer scans this in Luxtrace mobile app"
                  : "Buyer scans this to complete payment"}
              </p>
            </div>

            {/* QR Code */}
            {qrModal.qrDataUrl ? (
              <div className="flex flex-col items-center mb-6">
                <div className="p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(201,168,76,0.2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrModal.qrDataUrl}
                    alt="Payment QR Code"
                    width={240}
                    height={240}
                  />
                </div>
                <p className="text-zinc-500 text-[10px] font-mono mt-3 text-center">
                  {qrModal.saleResult?.sale_mode === "direct"
                    ? "📲 Point buyer's in-app QR scanner to authorize direct handover & verify product"
                    : "📲 Point buyer's camera at this code to open Midtrans checkout"}
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 mb-6 text-center">
                <p className="text-zinc-400 text-xs font-mono">
                  Payment link sent via push notification.
                </p>
              </div>
            )}

            {/* Sale Details */}
            {qrModal.saleResult && (
              <div className="space-y-2 border-t border-white/5 pt-4 mb-6">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Product
                  </span>
                  <span className="text-white">
                    {qrModal.saleResult.product?.brand}{" "}
                    {qrModal.saleResult.product?.name}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Serial
                  </span>
                  <span className="text-white">
                    {qrModal.saleResult.product?.serial_number}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Buyer
                  </span>
                  <span className="text-zinc-300">
                    {qrModal.saleResult.buyer?.email}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Amount
                  </span>
                  <span className="text-[#C9A84C] font-semibold">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(qrModal.saleResult.amount_idr)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Order ID
                  </span>
                  <span className="text-zinc-400">
                    {qrModal.saleResult.order_id}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setQrModal({ isOpen: false, qrDataUrl: "", saleResult: null });
                resetBoutiqueSale();
              }}
              className="w-full h-10 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 border border-[#C9A84C]/30 hover:border-[#C9A84C]/50 rounded-xl text-[#C9A84C] text-xs font-dm font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Initiate Another Sale
            </button>
          </div>
        </div>
      )}

      {/* ─── PREMIUM LOADER OVERLAY ───────────────────────────────────────────── */}
      <Loader
        isOpen={isLoaderOpen}
        title={loaderTitle}
        message={loaderMessage}
      />

      {/* ─── PREMIUM ALERT DIALOG ──────────────────────────────────────────────── */}
      <Alert
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
