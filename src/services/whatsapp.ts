import * as Sharing from "expo-sharing";

export async function shareStickerToWhatsApp(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "image/webp",
    dialogTitle: "Share sticker to WhatsApp",
    UTI: "public.webp",
  });
}
