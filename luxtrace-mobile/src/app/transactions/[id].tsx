import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Clipboard,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "@/constants/config";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useAlertStore } from "@/stores/alertStore";
import QRCode from "react-native-qrcode-svg";
import Ionicons from "@expo/vector-icons/Ionicons";

interface Product {
  product_id: string;
  serial_number: string;
  brand: string;
  name: string;
  price_idr: number;
  status: string;
  nft_token_id: string | null;
}

interface Transaction {
  transaction_id: string;
  type: "PRIMARY_BOUTIQUE" | "P2P_REMOTE_SHIPPING" | "P2P_DIRECT_HANDOVER";
  status:
    | "PENDING"
    | "PAID"
    | "IN_TRANSIT"
    | "COMPLETED"
    | "CANCELLED"
    | "FRAUD_FLAGGED";
  product_id: string;
  seller_id: string | null;
  buyer_id: string;
  amount_idr: number;
  payment_ref: string | null;
  blockchain_tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
  product?: Product;
  payment_url?: string;
}

interface QrSessionData {
  qr_payload: string;
  session_id: string;
  expires_at: string;
  instructions: string;
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore();
  const { showAlert } = useAlertStore();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [qrSession, setQrSession] = useState<QrSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTransactionDetails = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setTransaction(result.data);
        // Fetch the QR handover details for the seller/operator if applicable
        await checkAndFetchQr(result.data);
      } else {
        throw new Error(
          result.message || "Failed to load transaction details.",
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndFetchQr = async (tx: Transaction) => {
    const isBuyer = tx.buyer_id === user?.user_id;
    const isOperator = user?.role === "OPERATOR" || user?.role === "ADMIN";

    let shouldFetchQr = false;
    if (
      tx.type === "PRIMARY_BOUTIQUE" &&
      isOperator &&
      tx.status === "PENDING"
    ) {
      shouldFetchQr = true;
    } else if (
      tx.type === "P2P_DIRECT_HANDOVER" &&
      !isBuyer &&
      tx.status === "PENDING"
    ) {
      shouldFetchQr = true;
    } else if (
      tx.type === "P2P_REMOTE_SHIPPING" &&
      !isBuyer &&
      (tx.status === "PAID" || tx.status === "IN_TRANSIT")
    ) {
      shouldFetchQr = true;
    }

    if (shouldFetchQr) {
      setIsGeneratingQr(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/transactions/${tx.transaction_id}/qr`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const result = await response.json();
        if (response.ok && result.success) {
          setQrSession(result.data);
        } else {
          console.warn("Could not generate handover QR:", result.message);
        }
      } catch (err) {
        console.warn("Error fetching QR session:", err);
      } finally {
        setIsGeneratingQr(false);
      }
    } else {
      setQrSession(null);
    }
  };

  const getReplayProtectionHeaders = () => {
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString();
    return {
      "x-nonce": nonce,
      "x-timestamp": timestamp,
    };
  };

  const handleSimulatePayment = async () => {
    if (!token || !id) return;
    setIsSimulatingPayment(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/${id}/simulate-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...getReplayProtectionHeaders(),
          },
        },
      );
      const result = await response.json();
      if (response.ok && result.success) {
        showAlert(
          "Payment Simulated",
          "Deposit completed successfully. Transaction is now PAID. Mark as shipped when ready.",
        );
        fetchTransactionDetails();
      } else {
        throw new Error(result.message || "Simulation failed.");
      }
    } catch (err: any) {
      showAlert("Payment Failed", err.message || "Could not simulate payment.");
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleMarkAsShipped = async () => {
    if (!token || !id) return;
    setIsShipping(true);
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${id}/ship`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...getReplayProtectionHeaders(),
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showAlert(
          "Shipment Confirmed",
          "Transaction moved to IN_TRANSIT. Buyer may now verify NFC upon delivery.",
        );
        fetchTransactionDetails();
      } else {
        throw new Error(result.message || "Failed to mark as shipped.");
      }
    } catch (err: any) {
      showAlert(
        "Shipment Update Failed",
        err.message || "Could not update transaction status.",
      );
    } finally {
      setIsShipping(false);
    }
  };

  useEffect(() => {
    if (id && token) {
      fetchTransactionDetails();
    }
  }, [id, token]);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    showAlert("Copied", `${label} copied to clipboard.`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatExpiry = (isoString: string) => {
    if (isoString.startsWith("9999")) {
      return "No expiry — valid until used";
    }
    return formatDate(isoString);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00FFB2" />
        <Text style={styles.loadingText}>Synchronizing Ledger State...</Text>
      </View>
    );
  }

  if (errorMessage || !transaction) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>
          {errorMessage || "Transaction not found"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchTransactionDetails}
        >
          <Text style={styles.retryButtonText}>RETRY SYNC</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBuyer = transaction.buyer_id === user?.user_id;
  const roleLabel = isBuyer ? "BUYER" : "SELLER";

  let statusColor = "#a0aec0";
  let statusBg = "rgba(255, 255, 255, 0.05)";
  if (transaction.status === "PAID" || transaction.status === "IN_TRANSIT") {
    statusColor = "#00FFB2";
    statusBg = "rgba(0, 255, 178, 0.08)";
  } else if (transaction.status === "COMPLETED") {
    statusColor = "#10B981";
    statusBg = "rgba(16, 185, 129, 0.08)";
  } else if (
    transaction.status === "CANCELLED" ||
    transaction.status === "FRAUD_FLAGGED"
  ) {
    statusColor = "#ef4444";
    statusBg = "rgba(239, 68, 68, 0.08)";
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ESCROW LEDGER</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={fetchTransactionDetails}
        >
          <Ionicons name="refresh" size={16} color="#00FFB2" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.metaLabel}>TRANSACTION STATUS</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {transaction.status.replace("_", " ")}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.metaLabel}>ESCROW VALUE</Text>
              <Text style={styles.valueText}>
                {formatCurrency(transaction.amount_idr)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.metaLabel}>YOUR ROLE</Text>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {!isBuyer &&
          transaction.type === "P2P_REMOTE_SHIPPING" &&
          transaction.status === "PAID" && (
            <View style={styles.actionCard}>
              <Ionicons
                name="send-outline"
                size={28}
                color="#00FFB2"
                style={{ alignSelf: "center", marginBottom: 10 }}
              />
              <Text style={styles.actionTitle}>ITEM READY TO SHIP</Text>
              <Text style={styles.actionSubtext}>
                Buyer has funded escrow. Mark the item as shipped to move the
                transaction into IN_TRANSIT and allow NFC verification on
                delivery.
              </Text>
              <TouchableOpacity
                style={styles.payButton}
                onPress={handleMarkAsShipped}
                disabled={isShipping}
              >
                {isShipping ? (
                  <ActivityIndicator color="#0A0A0A" size="small" />
                ) : (
                  <Text style={styles.payButtonText}>MARK AS SHIPPED</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        {/* Product Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>ASSET SPECIFICATIONS</Text>
          <View style={styles.divider} />
          <Text style={styles.brandText}>
            {transaction.product?.brand.toUpperCase() || "BRAND"}
          </Text>
          <Text style={styles.productName}>
            {transaction.product?.name || "Loading Asset..."}
          </Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.metaLabel}>SERIAL NUMBER</Text>
              <Text style={styles.valueSubtext} numberOfLines={1}>
                {transaction.product?.serial_number}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.metaLabel}>NFT TOKEN ID</Text>
              <Text style={styles.valueSubtext}>
                {transaction.product?.nft_token_id
                  ? `#${transaction.product.nft_token_id}`
                  : "MINT PENDING"}
              </Text>
            </View>
          </View>
        </View>

        {/* QR CODE CARD (wajib menampilkan QR code yang diperlukan untuk di scan) */}
        {qrSession ? (
          <View style={styles.qrCard}>
            <View style={styles.qrIconWrapper}>
              <Ionicons name="qr-code-outline" size={24} color="#00FFB2" />
            </View>
            <Text style={styles.qrTitle}>HANDOVER QR SESSION</Text>
            <Text style={styles.qrSubtext}>
              Display this code to the buyer. They must scan it using their
              Luxtrace app and tap the physical NFC chip to release ownership.
            </Text>

            <View style={styles.qrWrapper}>
              <QRCode
                value={JSON.stringify({ session_id: qrSession.session_id })}
                size={180}
                backgroundColor="white"
                color="black"
              />
            </View>

            <TouchableOpacity
              onPress={() =>
                copyToClipboard(qrSession.session_id, "Session ID")
              }
              style={styles.copyWrapper}
            >
              <Ionicons name="copy-outline" size={14} color="#00FFB2" />
              <Text style={styles.copyCodeText}>
                {qrSession.session_id.slice(0, 8)}...
                {qrSession.session_id.slice(-8)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.expiryText}>
              Expires at: {formatExpiry(qrSession.expires_at)}
            </Text>
          </View>
        ) : isGeneratingQr ? (
          <View style={styles.qrCard}>
            <ActivityIndicator size="small" color="#00FFB2" />
            <Text style={styles.qrSubtext}>
              Generating Handover QR Session...
            </Text>
          </View>
        ) : null}

        {/* Buyer Actions / Waiting States */}
        {isBuyer &&
          transaction.status === "PENDING" &&
          (transaction.type === "P2P_REMOTE_SHIPPING" ||
            transaction.type === "PRIMARY_BOUTIQUE") && (
            <View style={styles.buyerActionCard}>
              <Ionicons
                name="cash-outline"
                size={32}
                color="#00FFB2"
                style={{ alignSelf: "center", marginBottom: 12 }}
              />
              <Text style={styles.buyerActionTitle}>
                ESCROW DEPOSIT REQUIRED
              </Text>
              <Text style={styles.buyerActionSubtext}>
                {transaction.type === "PRIMARY_BOUTIQUE"
                  ? "Please pay for your brand boutique purchase. The digital twin NFT will be minted and transferred upon payment confirmation."
                  : "Please fund the escrow to secure this transaction. The funds will be safely locked until you receive the product and verify the NFC."}
              </Text>

              {transaction.payment_url ? (
                <TouchableOpacity
                  style={[styles.payButton, { marginBottom: 12 }]}
                  onPress={() => {
                    if (transaction.payment_url) {
                      Linking.openURL(transaction.payment_url).catch((err) => {
                        showAlert("Error", "Failed to open payment page.");
                      });
                    }
                  }}
                >
                  <Text style={styles.payButtonText}>💳 PAY VIA MIDTRANS</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={
                  transaction.payment_url
                    ? styles.secondaryButton
                    : styles.payButton
                }
                onPress={handleSimulatePayment}
                disabled={isSimulatingPayment}
              >
                {isSimulatingPayment ? (
                  <ActivityIndicator
                    color={transaction.payment_url ? "#00FFB2" : "#0A0A0A"}
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      transaction.payment_url
                        ? styles.secondaryButtonText
                        : styles.payButtonText
                    }
                  >
                    {transaction.payment_url
                      ? "🧪 SIMULATE ESCROW DEPOSIT"
                      : "SIMULATE ESCROW DEPOSIT"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        {isBuyer &&
          (transaction.status === "PAID" ||
            transaction.status === "IN_TRANSIT" ||
            (transaction.status === "PENDING" &&
              (transaction.type === "P2P_DIRECT_HANDOVER" ||
                (transaction.type === "PRIMARY_BOUTIQUE" &&
                  !transaction.payment_ref)))) && (
            <View style={styles.buyerActionCard}>
              <Ionicons
                name="swap-horizontal-outline"
                size={32}
                color="#00FFB2"
                style={{ alignSelf: "center", marginBottom: 12 }}
              />
              <Text style={styles.buyerActionTitle}>
                READY FOR VERIFICATION
              </Text>
              <Text style={styles.buyerActionSubtext}>
                {transaction.type === "PRIMARY_BOUTIQUE"
                  ? "Meet the boutique staff, scan their Boutique Handover QR code, and tap the physical product NFC tag to claim ownership."
                  : transaction.type === "P2P_DIRECT_HANDOVER"
                    ? "Meet the seller, scan their Handover QR code, and verify physical NFC tag to claim ownership."
                    : "Escrow is funded. Meet the seller, scan their Handover QR code, and tap the physical product NFC tag to claim ownership."}
              </Text>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => router.push("/scan")}
              >
                <Text style={styles.payButtonText}>
                  OPEN VERIFICATION SCANNER
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Transaction Metadata Chain Audit */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>LEDGER RECORDS</Text>
          <View style={styles.divider} />

          <View style={styles.metaItemRow}>
            <Text style={styles.itemLabel}>Transaction ID</Text>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(transaction.transaction_id, "Transaction ID")
              }
            >
              <Text style={styles.itemValCopy}>
                {transaction.transaction_id.slice(0, 18)}...
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaItemRow}>
            <Text style={styles.itemLabel}>Transaction Type</Text>
            <Text style={styles.itemVal}>
              {transaction.type.replace("P2P_", "").replace("_", " ")}
            </Text>
          </View>

          <View style={styles.metaItemRow}>
            <Text style={styles.itemLabel}>Created Date</Text>
            <Text style={styles.itemVal}>
              {formatDate(transaction.created_at)}
            </Text>
          </View>

          {transaction.completed_at && (
            <View style={styles.metaItemRow}>
              <Text style={styles.itemLabel}>Completed Date</Text>
              <Text style={styles.itemVal}>
                {formatDate(transaction.completed_at)}
              </Text>
            </View>
          )}

          {transaction.blockchain_tx_hash && (
            <View style={styles.metaItemRow}>
              <Text style={styles.itemLabel}>On-chain Tx Hash</Text>
              <TouchableOpacity
                onPress={() =>
                  copyToClipboard(
                    transaction.blockchain_tx_hash!,
                    "On-chain Tx Hash",
                  )
                }
              >
                <Text style={styles.itemValLink}>
                  {transaction.blockchain_tx_hash.slice(0, 10)}...
                  {transaction.blockchain_tx_hash.slice(-8)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#718096",
    fontSize: 12,
    marginTop: 16,
    letterSpacing: 1,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    borderColor: "#00FFB2",
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#00FFB2",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: "#00FFB2",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  statusCard: {
    backgroundColor: "#0d1614",
    borderColor: "rgba(0, 255, 178, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    color: "#4a5568",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginVertical: 16,
  },
  valueText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  roleText: {
    color: "#00FFB2",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  card: {
    backgroundColor: "rgba(11, 15, 14, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.08)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  brandText: {
    color: "#00FFB2",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 2,
  },
  productName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCol: {
    flex: 0.48,
  },
  valueSubtext: {
    color: "#a0aec0",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 4,
  },
  qrCard: {
    backgroundColor: "rgba(11, 15, 14, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.15)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#00FFB2",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  actionCard: {
    backgroundColor: "#0d1614",
    borderColor: "rgba(0, 255, 178, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  actionTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 6,
  },
  actionSubtext: {
    color: "#a0aec0",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 16,
  },
  qrIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 255, 178, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  qrTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 6,
  },
  qrSubtext: {
    color: "#718096",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 20,
  },
  qrWrapper: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  copyWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1614",
    borderColor: "rgba(0, 255, 178, 0.15)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  copyCodeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginLeft: 6,
  },
  expiryText: {
    color: "#4a5568",
    fontSize: 9,
  },
  buyerActionCard: {
    backgroundColor: "#0d1614",
    borderColor: "rgba(0, 255, 178, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  buyerActionTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 6,
  },
  buyerActionSubtext: {
    color: "#a0aec0",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: "#00FFB2",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FFB2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  payButtonText: {
    color: "#0A0A0A",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  secondaryButton: {
    borderColor: "#00FFB2",
    borderWidth: 1.5,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#00FFB2",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  metaItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemLabel: {
    color: "#718096",
    fontSize: 10,
  },
  itemVal: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  itemValCopy: {
    color: "#00FFB2",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textDecorationLine: "underline",
  },
  itemValLink: {
    color: "#00FFB2",
    fontSize: 10,
    textDecorationLine: "underline",
  },
});
