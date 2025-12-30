const installButton = document.getElementById("installButton");
const loadDemo = document.getElementById("loadDemo");
const fileInput = document.getElementById("fileInput");
const botTokenInput = document.getElementById("botToken");
const stickerSetsInput = document.getElementById("stickerSets");
const loadTelegram = document.getElementById("loadTelegram");
const telegramSummary = document.getElementById("telegramSummary");
const buildPacks = document.getElementById("buildPacks");
const downloadJson = document.getElementById("downloadJson");
const output = document.getElementById("output");
const copyJson = document.getElementById("copyJson");

let deferredPrompt;
let telegramPacks = [];
let whatsappPayload = null;

const demoTelegramData = [
  {
    name: "Astral Cats",
    identifier: "astral_cats",
    publisher: "Tele2Whats Studio",
    stickers: Array.from({ length: 65 }, (_, index) => ({
      image_file: `astral_${index + 1}.webp`,
      emojis: ["😺"],
    })),
  },
  {
    name: "Retro Waves",
    identifier: "retro_waves",
    publisher: "Tele2Whats Studio",
    stickers: Array.from({ length: 18 }, (_, index) => ({
      image_file: `retro_${index + 1}.webp`,
      emojis: ["🌊"],
    })),
  },
];

const metadataDefaults = {
  publisher: "Tele2Whats Studio",
  publisher_email: "stickers@tele2whats.app",
  publisher_website: "https://tele2whats.app",
  privacy_policy_website: "https://tele2whats.app/privacy",
  license_agreement_website: "https://tele2whats.app/license",
};

installButton.disabled = true;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.disabled = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.disabled = true;
});

loadDemo.addEventListener("click", () => {
  telegramPacks = demoTelegramData;
  updateSummary();
});

loadTelegram.addEventListener("click", async () => {
  const botToken = botTokenInput.value.trim();
  const setNames = stickerSetsInput.value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!botToken || setNames.length === 0) {
    telegramSummary.textContent =
      "Enter a bot token and at least one sticker set name.";
    return;
  }

  loadTelegram.disabled = true;
  telegramSummary.textContent = "Fetching sticker sets from Telegram...";

  try {
    const packs = await fetchTelegramStickerSets(botToken, setNames);
    telegramPacks = packs;
    updateSummary();
  } catch (error) {
    telegramSummary.textContent = `Telegram API error: ${error.message}`;
  } finally {
    loadTelegram.disabled = false;
  }
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error("JSON must be an array of sticker packs.");
    }
    telegramPacks = data;
    updateSummary();
  } catch (error) {
    telegramSummary.textContent = `Import failed: ${error.message}`;
  }
});

buildPacks.addEventListener("click", () => {
  whatsappPayload = buildWhatsAppPayload(telegramPacks);
  output.textContent = JSON.stringify(whatsappPayload, null, 2);
  downloadJson.disabled = false;
  copyJson.disabled = false;
});

copyJson.addEventListener("click", async () => {
  if (!whatsappPayload) {
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(whatsappPayload, null, 2));
  copyJson.textContent = "Copied!";
  setTimeout(() => {
    copyJson.textContent = "Copy JSON";
  }, 2000);
});

downloadJson.addEventListener("click", () => {
  if (!whatsappPayload) {
    return;
  }
  const blob = new Blob([JSON.stringify(whatsappPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sticker_packs.json";
  link.click();
  URL.revokeObjectURL(url);
});

function updateSummary() {
  if (!telegramPacks.length) {
    telegramSummary.textContent = "No sticker packs loaded.";
    buildPacks.disabled = true;
    return;
  }

  const totalStickers = telegramPacks.reduce(
    (sum, pack) => sum + (pack.stickers?.length || 0),
    0
  );
  telegramSummary.textContent = `${telegramPacks.length} packs loaded with ${totalStickers} stickers.`;
  buildPacks.disabled = false;
}

async function fetchTelegramStickerSets(botToken, setNames) {
  const requests = setNames.map(async (setName) => {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(
        setName
      )}`
    );
    if (!response.ok) {
      throw new Error(`Failed to load ${setName}.`);
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || `Telegram error for ${setName}.`);
    }
    const stickerSet = data.result;
    return {
      name: stickerSet.title,
      identifier: stickerSet.name,
      publisher: stickerSet.name,
      stickers: stickerSet.stickers.map((sticker, index) => ({
        image_file: `${stickerSet.name}_${index + 1}.webp`,
        emojis: sticker.emoji ? [sticker.emoji] : ["✨"],
        telegram_file_id: sticker.file_id,
      })),
    };
  });

  return Promise.all(requests);
}

function buildWhatsAppPayload(packs) {
  const sticker_packs = packs.flatMap((pack) => {
    const stickers = pack.stickers || [];
    const chunks = chunkArray(stickers, 30);

    return chunks.map((chunk, index) => {
      const start = index * 30;
      const end = start + chunk.length;
      return {
        identifier: `${pack.identifier || slugify(pack.name)}_${index + 1}`,
        name: `${pack.name} (${start}-${end})`,
        publisher: pack.publisher || metadataDefaults.publisher,
        tray_image_file: chunk[0]?.image_file || "tray.png",
        publisher_email: metadataDefaults.publisher_email,
        publisher_website: metadataDefaults.publisher_website,
        privacy_policy_website: metadataDefaults.privacy_policy_website,
        license_agreement_website: metadataDefaults.license_agreement_website,
        stickers: chunk.map((sticker) => ({
          image_file: sticker.image_file,
          emojis: sticker.emojis || ["✨"],
        })),
      };
    });
  });

  return { sticker_packs };
}

function chunkArray(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  );
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .trim();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
