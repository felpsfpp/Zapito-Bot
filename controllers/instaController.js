const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const axios = require("axios");
const { MessageMedia } = require("whatsapp-web.js");

const { getInstaMedia } = require("../services/instaService");
const { TEMP_DIR } = require("../config");
const { deleteFile } = require("../utils/fileHelper");
const { logError } = require("../utils/logger");

async function handleInstaRequest(client, msg) {
  const url = msg.body.split(" ")[1];

  if (!url?.match(/https?:\/\/(www\.)?instagram\.com\/.+/)) {
    return msg.reply("⚠️ URL inválida");
  }

  let tempFilePath;

  try {
    await msg.reply("🔍 Baixando vídeo...");

    const videoUrl = await getInstaMedia(url);
    const filename = `instagram_${Date.now()}.mp4`;
    tempFilePath = path.join(TEMP_DIR, filename);

    const response = await axios.get(videoUrl, { responseType: "stream", timeout: 30000 });
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const videoBuffer = await fsPromises.readFile(tempFilePath);
    const media = new MessageMedia("video/mp4", videoBuffer.toString("base64"), filename);

    await client.sendMessage(msg.from, media, {
      caption: "Aqui está seu vídeo!",
      sendMediaAsDocument: true,
    });

  } catch (error) {
    logError(error, "instaController");
    msg.reply("❌ Erro ao obter vídeo do Instagram: " + error.message);
  } finally {
    if (tempFilePath) await deleteFile(tempFilePath);
  }
}

module.exports = { handleInstaRequest };
