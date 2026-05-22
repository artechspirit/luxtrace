import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Clipboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useAlertStore } from "@/stores/alertStore";
import { API_BASE_URL } from "@/constants/config";
import QRCode from "react-native-qrcode-svg";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function SellProductScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const { showAlert } = useAlertStore();

  const [transferMode, setTransferMode] = useState<"remote" | "direct">("remote");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directQrSessionId, setDirectQrSessionId] = useState<string | null>(null);

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

      // Success
      if (transferMode === "direct" && result.data?.session_id) {
        setDirectQrSessionId(result.data.session_id);
      } else {
        showAlert(
          "TRANSACTION INITIATED",
          `Remote shipping P2P Escrow initialized!\n\nMidtrans Snap URL generated. The buyer must pay the escrow to lock the transaction.`,
          [
            {
              text: "OK",
              onPress: () => {
                router.back();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>P2P TRANSFER INCEPTION</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageDescription}>
          Select the transfer mode, input the buyer's registered email address, and complete the process to hand over this asset.
        </Text>

        {/* Mode selection toggles */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, transferMode === "remote" && styles.toggleButtonActive]}
            onPress={() => setTransferMode("remote")}
          >
            <Text
              style={[styles.toggleButtonText, transferMode === "remote" && styles.toggleButtonTextActive]}
            >
              REMOTE SHIPPING
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, transferMode === "direct" && styles.toggleButtonActive]}
            onPress={() => setTransferMode("direct")}
          >
            <Text
              style={[styles.toggleButtonText, transferMode === "direct" && styles.toggleButtonTextActive]}
            >
              DIRECT HANDOVER
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buyer Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>BUYER EMAIL ADDRESS</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. buyer@example.com"
            placeholderTextColor="#4a5568"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={buyerEmail}
            onChangeText={setBuyerEmail}
          />
          <Text style={styles.inputHelpText}>
            The buyer must have a registered Luxtrace account.
          </Text>
        </View>

        {/* Price input (Only for Remote Shipping) */}
        {transferMode === "remote" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>AGREED PRICE (IDR)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 50000000"
              placeholderTextColor="#4a5568"
              keyboardType="numeric"
              autoCorrect={false}
              value={agreedPrice}
              onChangeText={setAgreedPrice}
            />
            <Text style={styles.inputHelpText}>
              Agreed payment price to be locked in Midtrans escrow.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateListing}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#0A0A0A" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>INITIATE P2P TRANSACTION</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Direct Handover QR Modal */}
      <Modal
        visible={!!directQrSessionId}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectQrSessionId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrIconWrapper}>
              <Ionicons name="swap-horizontal" size={24} color="#00FFB2" />
            </View>

            <Text style={styles.qrModalSubtitle}>Direct Handover</Text>
            <Text style={styles.qrModalTitle}>SCAN QR SESSION</Text>
            <Text style={styles.qrModalHelpText}>
              Buyer scans this to initiate the physical proximity NFC scan.
            </Text>

            {directQrSessionId && (
              <View style={styles.qrCodeContainer}>
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
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={12} color="#00FFB2" />
              <Text style={styles.copyButtonText}>
                {directQrSessionId
                  ? `${directQrSessionId.slice(0, 8)}...${directQrSessionId.slice(-8)}`
                  : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setDirectQrSessionId(null);
                router.back();
              }}
              style={styles.dismissButton}
            >
              <Text style={styles.dismissButtonText}>FINISH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    borderBottomColor: "rgba(255,255,255,0.05)",
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
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  pageDescription: {
    color: "#718096",
    fontSize: 12,
    marginBottom: 24,
    lineHeight: 18,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#0A0A0A",
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#00FFB2",
  },
  toggleButtonText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#718096",
  },
  toggleButtonTextActive: {
    color: "#0A0A0A",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#00FFB2",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#0A0A0A",
    color: "#FFFFFF",
    fontSize: 14,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputHelpText: {
    color: "#718096",
    fontSize: 10,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: "#00FFB2",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#00FFB2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#0A0A0A",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 24,
  },
  qrModalCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.2)",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  qrIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 255, 178, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  qrModalSubtitle: {
    color: "#00FFB2",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  qrModalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  qrModalHelpText: {
    color: "#718096",
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  qrCodeContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  copyButton: {
    backgroundColor: "rgba(20, 30, 28, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 178, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    marginLeft: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  dismissButton: {
    backgroundColor: "#00FFB2",
    width: "100%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    color: "#0A0A0A",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
