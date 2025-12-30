const installButton = document.getElementById("installButton");
const telegramLink = document.getElementById("telegramLink");
const botToken = document.getElementById("botToken");
const oneClick = document.getElementById("oneClick");
const loadDemo = document.getElementById("loadDemo");
const fileInput = document.getElementById("fileInput");
const telegramSummary = document.getElementById("telegramSummary");
const buildPacks = document.getElementById("buildPacks");
const downloadJson = document.getElementById("downloadJson");
const output = document.getElementById("output");
const copyJson = document.getElementById("copyJson");
const openWhatsApp = document.getElementById("openWhatsApp");

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

oneClick.addEventListener("click", async () => {
  const linkValue = telegramLink.value.trim();
  const tokenValue = botToken.value.trim();

  oneClick.disabled = true;
  oneClick.textContent = "Converting...";
  telegramSummary.textContent = "Fetching sticker data from Telegram...";

  try {
    const pack = await fetchTelegramStickerSet(linkValue, tokenValue);
    telegramPacks = [pack];
    updateSummary();
    whatsappPayload = buildWhatsAppPayload(telegramPacks);
    output.textContent = JSON.stringify(whatsappPayload, null, 2);
    downloadJson.disabled = false;
    copyJson.disabled = false;
    await navigator.clipboard.writeText(
      JSON.stringify(whatsappPayload, null, 2)
    );
    downloadJson.click();
    if (openWhatsApp?.href) {
      window.open(openWhatsApp.href, "_blank", "noreferrer");
    }
    telegramSummary.textContent = `Converted ${pack.name}. JSON copied and WhatsApp opened.`;
  } catch (error) {
    telegramSummary.textContent = `Conversion failed: ${error.message}`;
  } finally {
    oneClick.disabled = false;
    oneClick.textContent = "Convert & Open WhatsApp";
  }
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

function buildWhatsAppPayload(packs) {
  const sticker_packs = packs.flatMap((pack) => {
    const stickers = pack.stickers || [];
    const chunks = chunkArray(stickers, 30);

    return chunks.map((chunk, index) => {
      const start = index * 30;
      const end = start + chunk.length;
      return {
        identifier: `${pack.identifier || slugify(pack.name)}_${index + 1}`,
        name: `${pack.name} ${index + 1}`,
        publisher: pack.publisher || metadataDefaults.publisher,
        tray_image_file: chunk[0]?.image_file || "tray.png",
        publisher_email: metadataDefaults.publisher_email,
        publisher_website: metadataDefaults.publisher_website,
        privacy_policy_website: metadataDefaults.privacy_policy_website,
        license_agreement_website: metadataDefaults.license_agreement_website,
        stickers: chunk.map((sticker) => ({
          image_file: sticker.image_file,
          emojis: sticker.emojis || ["✨"],
          source_url: sticker.source_url,
        })),
      };
    });
  });

  return { sticker_packs };
}

function parseStickerSetName(link) {
  const cleaned = link.trim().split(/[?#]/)[0];
  if (!cleaned) {
    throw new Error("Add a Telegram sticker link first.");
  }
  const match = cleaned.match(/addstickers\/([a-zA-Z0-9_]+)/);
  if (match) {
    return match[1];
  }
  const fallback = cleaned.split("/").pop();
  if (!fallback) {
    throw new Error("Unable to read the sticker set name from the link.");
  }
  return fallback;
}

async function fetchTelegramStickerSet(link, token) {
  if (!token) {
    throw new Error("Add a Telegram bot token to access sticker files.");
  }
  const setName = parseStickerSetName(link);
  const setResponse = await fetch(
    `https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(
      setName
    )}`
  );
  const setData = await setResponse.json();
  if (!setData.ok) {
    throw new Error(setData.description || "Telegram sticker set lookup failed.");
  }

  const stickers = await Promise.all(
    setData.result.stickers.map(async (sticker, index) => {
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(
          sticker.file_id
        )}`
      );
      const fileData = await fileResponse.json();
      if (!fileData.ok) {
        throw new Error(
          fileData.description || "Telegram sticker file lookup failed."
        );
      }
      const filePath = fileData.result.file_path;
      const fileName = filePath.split("/").pop() || `sticker_${index + 1}.webp`;
      const emojiList = sticker.emojis || sticker.emoji_list || [];
      const emojiValue = sticker.emoji
        ? [sticker.emoji]
        : Array.isArray(emojiList) && emojiList.length
        ? emojiList
        : ["✨"];

      return {
        image_file: fileName,
        emojis: emojiValue,
        source_url: `https://api.telegram.org/file/bot${token}/${filePath}`,
      };
    })
  );

  return {
    name: setData.result.title || setName,
    identifier: setData.result.name || setName,
    publisher: metadataDefaults.publisher,
    stickers,
  };
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
