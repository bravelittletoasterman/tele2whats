export function parseStickerPackName(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    throw new Error("Paste a Telegram sticker pack URL.");
  }

  const urlMatch = normalized.match(/https?:\/\/t\.me\/(addstickers|addemoji)\/([^/?#]+)/i);
  if (urlMatch) {
    return urlMatch[2];
  }

  if (normalized.startsWith("@")) {
    return normalized.slice(1);
  }

  if (normalized.includes("/")) {
    throw new Error("Only sticker pack URLs are supported. Example: https://t.me/addstickers/animals");
  }

  return normalized;
}
