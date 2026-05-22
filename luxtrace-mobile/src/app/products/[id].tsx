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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "@/constants/config";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useAlertStore } from "@/stores/alertStore";
import QRCode from "react-native-qrcode-svg";
import Ionicons from "@expo/vector-icons/Ionicons";

interface TimelineEvent {
  log_id: string;
  event: string;
  actor_role: string;
  metadata: Record<string, any>;
  timestamp: string;
}

interface ProvenanceData {
  product_id: string;
  serial_number: string;
  brand: string;
  name: string;
  nft_token_id: string | null;
  current_status: string;
  timeline: TimelineEvent[];
}

export default function ProductProvenanceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const { showAlert } = useAlertStore();
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // P2P Listing States
  const [isOwner, setIsOwner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"remote" | "direct">(
    "remote",
  );
  const [agreedPrice, setAgreedPrice] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directQrSessionId, setDirectQrSessionId] = useState<string | null>(
    null,
  );

  const checkOwnership = async () => {
    if (!token || !id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        const owned = result.data?.items || result.data || [];
        const found = owned.some((p: any) => p.product_id === id);
        setIsOwner(found);
      }
    } catch (e) {
      console.warn("Failed to verify ownership", e);
    }
  };

  const handleCreateListing = async () => {
    if (!buyerEmail.trim()) {
      showAlert("Validation Error", "Please enter the buyer email address.");
      return;
    }

    if (
      transferMode === "remote" &&
      (!agreedPrice || isNaN(Number(agreedPrice)) || Number(agreedPrice) <= 0)
    ) {
      showAlert("Validation Error", "Please enter a valid agreed price (IDR).");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Lookup Buyer ID by Email
      const lookupResponse = await fetch(
        `${API_BASE_URL}/users/lookup?email=${encodeURIComponent(buyerEmail.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const lookupResult = await lookupResponse.json();
      if (!lookupResponse.ok || !lookupResult.success) {
        throw new Error(
          lookupResult.message ||
            "Buyer user profile not found. Make sure they are registered.",
        );
      }

      const buyerId = lookupResult.data?.user_id;
      if (!buyerId) {
        throw new Error("Could not resolve Buyer ID.");
      }

      // Generate Replay Protection Headers
      const nonce =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now().toString();

      // 2. Initiate transaction
      const endpoint =
        transferMode === "remote" ? "/p2p/remote/init" : "/p2p/direct/init";
      const payload =
        transferMode === "remote"
          ? {
              product_id: id,
              buyer_id: buyerId,
              agreed_price_idr: Number(agreedPrice),
            }
          : { product_id: id, buyer_id: buyerId };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-nonce": nonce,
          "x-timestamp": timestamp,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Transaction initiation failed.");
      }

      // Auto-copy to clipboard for easier testing
      if (transferMode === "direct" && result.data?.session_id) {
        Clipboard.setString(result.data.session_id);
      }

      // Success
      if (transferMode === "direct" && result.data?.session_id) {
        setDirectQrSessionId(result.data.session_id);
        setIsModalOpen(false);
        setBuyerEmail("");
        setAgreedPrice("");
        fetchProvenance();
      } else {
        showAlert(
          "TRANSACTION INITIATED",
          `Remote shipping P2P Escrow initialized!\n\nMidtrans Snap URL generated. The buyer must pay the escrow to lock the transaction.`,
          [
            {
              text: "OK",
              onPress: () => {
                setIsModalOpen(false);
                setBuyerEmail("");
                setAgreedPrice("");
                fetchProvenance(); // Refresh provenance history
              },
            },
          ],
        );
      }
    } catch (err: any) {
      showAlert(
        "Listing Failed",
        err.message || "Failed to initialize P2P Listing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProvenance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/provenance/${id}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch provenance history");
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProvenance();
      checkOwnership();
    }
  }, [id]);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    showAlert("Copied", `${label} copied to clipboard.`);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventStyle = (event: string) => {
    switch (event.toUpperCase()) {
      case "MANUFACTURED":
        return {
          label: "MANUFACTURED",
          color: "#00FFB2",
          glow: styles.glowGreen,
        };
      case "REGISTERED":
        return {
          label: "NFC BIND COMPLETE",
          color: "#00FFB2",
          glow: styles.glowGreen,
        };
      case "TRANSFER":
      case "TRANSFERRED":
        return {
          label: "OWNERSHIP HANDOVER",
          color: "#00E6A8",
          glow: styles.glowGreen,
        };
      case "FRAUD_FLAGGED":
      case "FRAUD_ATTEMPT":
        return {
          label: "FRAUD ATTEMPT DETECTED",
          color: "#FF0055",
          glow: styles.glowRed,
        };
      default:
        return {
          label: event.replace("_", " "),
          color: "#38A169",
          glow: styles.glowGreen,
        };
    }
  };

  return (
    <View
      className="flex-1 bg-[#0A0A0A]"
      style={{ paddingTop: Math.max(insets.top, 8) }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header bar */}
      <View className="flex-row justify-between items-center px-4 h-14 border-b border-white/5">
        <TouchableOpacity className="py-2 px-3" onPress={() => router.back()}>
          <Text className="text-[#00FFB2] text-xs font-jakarta-bold tracking-[1.5px]">
            ← BACK
          </Text>
        </TouchableOpacity>
        <Text className="text-white text-sm font-jakarta-bold tracking-[2px]">
          PROVENANCE CHAIN
        </Text>
        <View className="w-16" />
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#00FFB2" />
          <Text className="text-[#a0aec0] text-xs font-jakarta tracking-wider mt-4">
            Reading Ledger Records...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-400 text-xs font-jakarta text-center mb-5">
            {error}
          </Text>
          <TouchableOpacity
            className="border border-[#00FFB2] px-5 py-2.5 rounded-lg"
            onPress={fetchProvenance}
          >
            <Text className="text-[#00FFB2] text-xs font-jakarta-bold tracking-[1.5px]">
              RETRY SYNC
            </Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-[#718096] text-xs font-jakarta text-center">
            No records found
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingBottom: Math.max(insets.bottom + 24, 60),
          }}
        >
          {/* Twin Properties Section */}
          <View className="bg-[#0D1110] border border-[#00FFB2]/8 rounded-2xl p-5 mb-6">
            <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[2px] mb-1">
              {data.brand.toUpperCase()}
            </Text>
            <Text className="text-white text-lg font-jakarta-bold mb-4">
              {data.name}
            </Text>

            <View className="h-[1px] bg-[#00FFB2]/10 mb-4" />

            <View className="flex-row justify-between mb-4">
              <View className="flex-[0.48]">
                <Text className="text-[#4a5568] text-[8px] font-jakarta-bold tracking-wider mb-1">
                  SERIAL NUMBER
                </Text>
                <Text
                  className="text-[#a0aec0] text-[11px] font-jakarta-semibold"
                  numberOfLines={1}
                >
                  {data.serial_number}
                </Text>
              </View>
              <View className="flex-[0.48]">
                <Text className="text-[#4a5568] text-[8px] font-jakarta-bold tracking-wider mb-1">
                  NFT TOKEN ID
                </Text>
                <Text className="text-[#a0aec0] text-[11px] font-jakarta-semibold">
                  {data.nft_token_id ? `# ${data.nft_token_id}` : "UNMINTED"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mt-2">
              <Text className="text-[#718096] text-xs font-jakarta-medium mr-2">
                REGISTRY STATE:
              </Text>
              <View className="bg-[#00FFB2]/10 border border-[#00FFB2]/20 px-2.5 py-1 rounded-md">
                <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold">
                  {data.current_status}
                </Text>
              </View>
            </View>
          </View>

          {/* Timeline Section */}
          <Text className="text-white text-xs font-jakarta-bold tracking-[2px] mb-5 opacity-70">
            CHRONOLOGICAL LEDGER
          </Text>

          {data.timeline && data.timeline.length > 0 ? (
            <View className="pl-1">
              {data.timeline.map((event, index) => {
                const isLast = index === data.timeline.length - 1;
                const config = getEventStyle(event.event);
                const isFraud = event.event.includes("FRAUD");

                return (
                  <View key={event.log_id} className="flex-row min-h-[90px]">
                    {/* Time Marker Column */}
                    <View className="w-[65px] pr-2 items-end pt-2">
                      <Text className="text-white text-[11px] font-jakarta-bold">
                        {formatDate(event.timestamp).split(",")[0]}
                      </Text>
                      <Text className="text-[#4a5568] text-[9px] font-jakarta mt-0.5">
                        {formatDate(event.timestamp)
                          .split(",")[1]
                          ?.trim()
                          .split(" ")[0] || ""}
                      </Text>
                    </View>

                    {/* Glowing Node Column */}
                    <View className="w-6 items-center relative">
                      <View
                        className={`w-4 h-4 rounded-full justify-center items-center z-10 border ${isFraud ? "bg-red-500/10 border-red-500/30" : "bg-[#00FFB2]/10 border-[#00FFB2]/25"}`}
                      >
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                      </View>
                      {!isLast && (
                        <View className="w-[1.5px] bg-[#00FFB2]/15 absolute top-[16px] bottom-[-16px] z-0" />
                      )}
                    </View>

                    {/* Event Detail Card Column */}
                    <View className="flex-grow pl-3 pb-6">
                      <View
                        className={`bg-[#0D1110]/50 border rounded-xl p-4.5 ${isFraud ? "border-red-500/15 bg-red-500/2" : "border-white/5"}`}
                        style={{
                          borderLeftColor: config.color,
                          borderLeftWidth: 3,
                        }}
                      >
                        <Text
                          className="text-xs font-jakarta-bold tracking-wider mb-1"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </Text>
                        <Text className="text-[#718096] text-[9px] font-jakarta-semibold tracking-wide mb-2">
                          ACTOR: {event.actor_role.toUpperCase()}
                        </Text>

                        {/* Metadata details */}
                        {event.metadata && (
                          <View className="bg-black/40 rounded-lg p-2 mt-1">
                            {Object.entries(event.metadata).map(
                              ([key, val]) => {
                                if (typeof val === "object") return null;
                                const valStr = String(val);
                                const isAddress = valStr.startsWith("0x");
                                return (
                                  <TouchableOpacity
                                    key={key}
                                    disabled={!isAddress}
                                    onPress={() =>
                                      isAddress && copyToClipboard(valStr, key)
                                    }
                                    className="flex-row justify-between py-1"
                                  >
                                    <Text className="text-[#4a5568] text-[8px] font-jakarta-bold">
                                      {key.replace("_", " ").toUpperCase()}:
                                    </Text>
                                    <Text
                                      numberOfLines={1}
                                      className={`text-[#a0aec0] text-[9px] flex-1 text-right pl-3 ${isAddress ? "text-[#00FFB2] underline" : ""}`}
                                    >
                                      {valStr}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              },
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="bg-[#0D1110]/50 border border-white/5 rounded-xl p-6 items-center">
              <Text className="text-[#4a5568] text-xs font-jakarta">
                No provenance history registered.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sell / Transfer Trigger Button */}
      {isOwner && data?.current_status === "OWNED" && (
        <View
          className="px-6 border-t border-white/5 bg-[#0A0A0A]"
          style={{
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <TouchableOpacity
            className="bg-[#00FFB2] h-12 rounded-xl items-center justify-center shadow-lg shadow-[#00FFB2]/20"
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[1.5px]">
              SELL / TRANSFER ASSET
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* P2P Listing Inception Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/60"
          activeOpacity={1}
          onPress={() => setIsModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 24}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="bg-[#111111] border-t border-[#00FFB2]/25 rounded-t-[30px] p-6"
              style={{
                width: "100%",
                shadowColor: "#00FFB2",
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 24,
                paddingBottom: Math.max(insets.bottom + 20, 40),
              }}
            >
              {/* Drag Handle Indicator */}
              <View
                className="w-12 h-1 bg-white/20 rounded-full mb-4"
                style={{ alignSelf: "center" }}
              />

              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-base font-jakarta-bold tracking-wide">
                  P2P TRANSFER INCEPTION
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Text className="text-[#718096] text-xs font-jakarta-bold">
                    CLOSE
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mode selection toggles */}
              <View className="flex-row bg-[#0A0A0A] p-1 rounded-xl mb-6 border border-white/5">
                <TouchableOpacity
                  className={`flex-1 py-2.5 rounded-lg items-center ${transferMode === "remote" ? "bg-[#00FFB2]" : ""}`}
                  onPress={() => setTransferMode("remote")}
                >
                  <Text
                    className={`text-[10px] font-jakarta-bold tracking-wider ${transferMode === "remote" ? "text-[#0A0A0A]" : "text-[#718096]"}`}
                  >
                    REMOTE SHIPPING
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2.5 rounded-lg items-center ${transferMode === "direct" ? "bg-[#00FFB2]" : ""}`}
                  onPress={() => setTransferMode("direct")}
                >
                  <Text
                    className={`text-[10px] font-jakarta-bold tracking-wider ${transferMode === "direct" ? "text-[#0A0A0A]" : "text-[#718096]"}`}
                  >
                    DIRECT HANDOVER
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Buyer Email Input */}
              <View className="mb-5">
                <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">
                  BUYER EMAIL ADDRESS
                </Text>
                <TextInput
                  className="bg-[#0A0A0A] text-white text-sm px-4 h-12 rounded-xl border border-white/5 font-jakarta"
                  placeholder="e.g. buyer@example.com"
                  placeholderTextColor="#4a5568"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  value={buyerEmail}
                  onChangeText={setBuyerEmail}
                />
                <Text className="text-[#718096] text-[10px] font-jakarta mt-2">
                  The buyer must have a registered Luxtrace account.
                </Text>
              </View>

              {/* Price input (Only for Remote Shipping) */}
              {transferMode === "remote" && (
                <View className="mb-6">
                  <Text className="text-[#00FFB2] text-[9px] font-jakarta-bold tracking-[1.5px] mb-2">
                    AGREED PRICE (IDR)
                  </Text>
                  <TextInput
                    className="bg-[#0A0A0A] text-white text-sm px-4 h-12 rounded-xl border border-white/5 font-jakarta"
                    placeholder="e.g. 50000000"
                    placeholderTextColor="#4a5568"
                    keyboardType="numeric"
                    autoCorrect={false}
                    value={agreedPrice}
                    onChangeText={setAgreedPrice}
                  />
                  <Text className="text-[#718096] text-[10px] font-jakarta mt-2">
                    Agreed payment price to be locked in Midtrans escrow.
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                className="bg-[#00FFB2] h-12 rounded-xl items-center justify-center shadow-md shadow-[#00FFB2]/20 flex-row"
                onPress={handleCreateListing}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0A0A0A" size="small" />
                ) : (
                  <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[1.5px]">
                    INITIATE P2P TRANSACTION
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Direct Handover QR Modal */}
      <Modal
        visible={!!directQrSessionId}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectQrSessionId(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/85 px-6">
          <View
            className="bg-[#111111] border border-[#00FFB2]/20 rounded-[24px] p-6 w-full max-w-sm items-center"
            style={{
              shadowColor: "#00FFB2",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="w-12 h-12 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 flex items-center justify-center mb-3">
              <Ionicons name="swap-horizontal" size={24} color="#00FFB2" />
            </View>

            <Text className="text-[#00FFB2] text-[10px] font-jakarta-bold tracking-[3px] uppercase mb-1">
              Direct Handover
            </Text>
            <Text className="text-white text-base font-jakarta-bold text-center">
              SCAN QR SESSION
            </Text>
            <Text className="text-[#718096] text-[10px] font-jakarta text-center mt-1 mb-6">
              Buyer scans this to initiate the physical proximity NFC scan.
            </Text>

            {directQrSessionId && (
              <View className="bg-white p-4 rounded-2xl mb-6 shadow-lg shadow-[#00FFB2]/10">
                <QRCode
                  value={JSON.stringify({ session_id: directQrSessionId })}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                if (directQrSessionId) {
                  Clipboard.setString(directQrSessionId);
                  showAlert("Copied", "Session ID copied to clipboard.");
                }
              }}
              className="bg-[#141e1c]/40 border border-[#00FFB2]/20 rounded-xl px-4 py-2.5 mb-4 flex-row items-center gap-1.5"
            >
              <Ionicons name="copy-outline" size={12} color="#00FFB2" />
              <Text className="text-white text-[10px] font-mono select-all">
                {directQrSessionId
                  ? `${directQrSessionId.slice(0, 8)}...${directQrSessionId.slice(-8)}`
                  : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDirectQrSessionId(null)}
              className="bg-[#00FFB2] w-full h-11 rounded-xl items-center justify-center active:opacity-90 shadow-md shadow-[#00FFB2]/20"
            >
              <Text className="text-[#0A0A0A] text-xs font-jakarta-bold tracking-[1.5px] uppercase">
                DISMISS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#a0aec0",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    borderColor: "#00FFB2",
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#00FFB2",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  productCard: {
    backgroundColor: "rgba(11, 15, 14, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.08)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#00FFB2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  productBrand: {
    color: "#00FFB2",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  productName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 255, 178, 0.1)",
    marginVertical: 16,
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaItem: {
    flex: 0.48,
  },
  metaLabel: {
    color: "#4a5568",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    color: "#a0aec0",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "bold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusLabel: {
    color: "#718096",
    fontSize: 11,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: "rgba(0, 255, 178, 0.08)",
    borderColor: "rgba(0, 255, 178, 0.2)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#00FFB2",
    fontSize: 10,
    fontWeight: "bold",
  },
  timelineHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 20,
    opacity: 0.7,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 90,
  },
  timeColumn: {
    width: 65,
    paddingRight: 10,
    alignItems: "flex-end",
    paddingTop: 8,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  subTimeText: {
    color: "#4a5568",
    fontSize: 9,
    marginTop: 2,
  },
  nodeColumn: {
    width: 24,
    alignItems: "center",
    position: "relative",
  },
  outerNodeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0, 255, 178, 0.1)",
    borderColor: "rgba(0, 255, 178, 0.25)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  outerCircleRed: {
    backgroundColor: "rgba(255, 0, 85, 0.1)",
    borderColor: "rgba(255, 0, 85, 0.3)",
  },
  innerNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glowGreen: {
    shadowColor: "#00FFB2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glowRed: {
    shadowColor: "#FF0055",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: "rgba(0, 255, 178, 0.15)",
    position: "absolute",
    top: 18,
    bottom: -18,
    zIndex: 1,
  },
  cardColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  eventCard: {
    backgroundColor: "rgba(11, 15, 14, 0.55)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.05)",
    padding: 14,
  },
  eventCardRed: {
    borderColor: "rgba(255, 0, 85, 0.15)",
    backgroundColor: "rgba(255, 0, 85, 0.02)",
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  eventActor: {
    color: "#718096",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 10,
  },
  metadataBox: {
    backgroundColor: "#070707",
    borderRadius: 8,
    padding: 8,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  metadataKey: {
    color: "#4a5568",
    fontSize: 8,
    fontWeight: "bold",
  },
  metadataVal: {
    color: "#a0aec0",
    fontSize: 9,
    flex: 1,
    textAlign: "right",
    paddingLeft: 12,
  },
  addressVal: {
    color: "#00FFB2",
    textDecorationLine: "underline",
  },
  noHistoryBox: {
    backgroundColor: "rgba(11, 15, 14, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.08)",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  noHistoryText: {
    color: "#4a5568",
    fontSize: 12,
  },
});
