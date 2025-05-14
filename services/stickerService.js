const sharp = require("sharp");
const { logError } = require("../utils/logger");

async function createSticker(msg) {
  try {
    const media = await msg.downloadMedia();

    if (!media || !media.data) {
      throw new Error("Mídia não encontrada ou vazia.");
    }

    let base64 = media.data;

    // Remove prefixo se existir
    const base64Index = base64.indexOf("base64,");
    if (base64Index !== -1) {
      base64 = base64.substring(base64Index + 7);
    }

    const buffer = Buffer.from(base64, "base64");

    // Redimensiona e converte para WebP
    return await sharp(buffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 90, lossless: true })
      .toBuffer();

  } catch (error) {
    logError(error, `createSticker: ${msg.id?._serialized || "sem id"}`);
    throw new Error("Erro ao processar figurinha: " + error.message);
  }
}

module.exports = { createSticker };
