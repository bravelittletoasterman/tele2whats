import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { useMemo, useState } from "react";
import { StickerPreview } from "@/components/StickerPreview";
import { downloadStickerFile, fetchStickerSet } from "@/services/telegram";
import { shareStickerToWhatsApp } from "@/services/whatsapp";
import { parseStickerPackName } from "@/utils/telegram";

interface ConvertedSticker {
  uri: string;
  emoji?: string;
}

const CACHE_DIR = `${FileSystem.cacheDirectory}tele2whats/`;

export default function App() {
  const [packUrl, setPackUrl] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState("Paste a Telegram sticker pack URL to start.");
  const [stickers, setStickers] = useState<ConvertedSticker[]>([]);
  const [packTitle, setPackTitle] = useState<string | null>(null);

  const canShareAll = useMemo(() => stickers.length > 0 && !isWorking, [stickers, isWorking]);

  const handleConvert = async () => {
    try {
      setIsWorking(true);
      setStatus("Reading sticker pack...");
      setStickers([]);
      setPackTitle(null);

      const packName = parseStickerPackName(packUrl);
      const stickerSet = await fetchStickerSet(packName);
      setPackTitle(stickerSet.title);

      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });

      const converted: ConvertedSticker[] = [];
      for (let index = 0; index < stickerSet.stickers.length; index += 1) {
        const sticker = stickerSet.stickers[index];
        setStatus(`Downloading sticker ${index + 1} of ${stickerSet.stickers.length}...`);

        const localUri = await downloadStickerFile(sticker.fileId, CACHE_DIR);
        const resized = await ImageManipulator.manipulateAsync(
          localUri,
          [{ resize: { width: 512, height: 512 } }],
          { compress: 1, format: ImageManipulator.SaveFormat.WEBP },
        );

        converted.push({ uri: resized.uri, emoji: sticker.emoji });
        setStickers([...converted]);
      }

      setStatus("Converted! Share stickers to WhatsApp to add them.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      Alert.alert("Conversion failed", message);
      setStatus("Ready when you are.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleShareAll = async () => {
    try {
      setIsWorking(true);
      for (let index = 0; index < stickers.length; index += 1) {
        setStatus(`Sharing sticker ${index + 1} of ${stickers.length}...`);
        await shareStickerToWhatsApp(stickers[index].uri);
      }
      setStatus("All stickers shared. Finish adding them in WhatsApp.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      Alert.alert("Sharing failed", message);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Tele2Whats</Text>
        <Text style={styles.subtitle}>
          Convert Telegram sticker packs to WhatsApp-ready WEBP stickers.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Telegram sticker pack URL</Text>
        <TextInput
          placeholder="https://t.me/addstickers/packname"
          placeholderTextColor="#5f7380"
          autoCapitalize="none"
          value={packUrl}
          onChangeText={setPackUrl}
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, isWorking && styles.buttonDisabled]}
          disabled={isWorking}
          onPress={handleConvert}
        >
          {isWorking ? <ActivityIndicator color="#0b141a" /> : <Text style={styles.buttonText}>Convert</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{status}</Text>
        {packTitle ? <Text style={styles.packTitle}>Pack: {packTitle}</Text> : null}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={stickers}
        keyExtractor={(item) => item.uri}
        numColumns={2}
        renderItem={({ item }) => (
          <StickerPreview uri={item.uri} label={item.emoji ? `Emoji: ${item.emoji}` : undefined} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Converted stickers will appear here. Add your Telegram bot token in EXPO_PUBLIC_TELEGRAM_BOT_TOKEN.
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.secondaryButton, !canShareAll && styles.buttonDisabled]}
          disabled={!canShareAll}
          onPress={handleShareAll}
        >
          <Text style={styles.secondaryButtonText}>Share all to WhatsApp</Text>
        </TouchableOpacity>
        <Text style={styles.footerHint}>
          WhatsApp will open a share sheet. Choose WhatsApp to add each sticker.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    color: "#e7f0f7",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9cb0be",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: "#14202a",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  label: {
    color: "#cfdbe4",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0f1b23",
    color: "#e7f0f7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#243441",
  },
  button: {
    backgroundColor: "#2affc9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#0b141a",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 4,
  },
  statusText: {
    color: "#9cb0be",
    fontSize: 13,
  },
  packTitle: {
    color: "#d9e6ef",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  emptyState: {
    backgroundColor: "#101b23",
    borderRadius: 16,
    padding: 16,
  },
  emptyText: {
    color: "#8ea2b2",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2affc9",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2affc9",
    fontWeight: "700",
  },
  footerHint: {
    color: "#7b919f",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});
