import * as FileSystem from "expo-file-system";

export interface TelegramStickerFile {
  fileId: string;
  mimeType: string;
  emoji?: string;
}

export interface TelegramStickerSet {
  title: string;
  stickers: TelegramStickerFile[];
}

interface TelegramApiSticker {
  file_id: string;
  emoji?: string;
  is_video?: boolean;
  is_animated?: boolean;
}

interface TelegramStickerSetResponse {
  ok: boolean;
  result: {
    title: string;
    stickers: TelegramApiSticker[];
  };
}

interface TelegramFileResponse {
  ok: boolean;
  result: {
    file_path: string;
  };
}

const API_ROOT = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "Missing Telegram bot token. Set EXPO_PUBLIC_TELEGRAM_BOT_TOKEN in your environment.",
    );
  }
  return token;
}

export async function fetchStickerSet(name: string): Promise<TelegramStickerSet> {
  const token = getBotToken();
  const response = await fetch(`${API_ROOT}/bot${token}/getStickerSet?name=${name}`);
  const data = (await response.json()) as TelegramStickerSetResponse;
  if (!data.ok) {
    throw new Error("Telegram API error fetching sticker set.");
  }

  const stickers: TelegramStickerFile[] = data.result.stickers
    .filter((sticker) => !sticker.is_video && !sticker.is_animated)
    .map((sticker) => ({
      fileId: sticker.file_id,
      emoji: sticker.emoji,
      mimeType: "image/webp",
    }));

  return {
    title: data.result.title,
    stickers,
  };
}

export async function downloadStickerFile(fileId: string, destDir: string): Promise<string> {
  const token = getBotToken();
  const fileResponse = await fetch(`${API_ROOT}/bot${token}/getFile?file_id=${fileId}`);
  const fileData = (await fileResponse.json()) as TelegramFileResponse;
  if (!fileData.ok) {
    throw new Error("Telegram API error downloading sticker file.");
  }

  const filePath = fileData.result.file_path;
  const fileUrl = `${API_ROOT}/file/bot${token}/${filePath}`;
  const fileName = filePath.split("/").pop() ?? `${fileId}.webp`;
  const localUri = `${destDir}${fileName}`;

  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);
  return downloadResult.uri;
}
