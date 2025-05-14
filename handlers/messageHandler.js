const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const axios = require("axios");
const { MessageMedia } = require("whatsapp-web.js");

const { createSticker } = require("../controllers/stickerController");
const { getInstaMedia } = require("../repositories/instaRepository");
const { TEMP_DIR } = require("../config");
const { deleteFile } = require("../utils/fileHelper");
const { logError } = require("../utils/logger");

async function handleMessage(client, msg) {
  try {
    const body = msg.body.toLowerCase().trim();

// Função para criação de stickers
if (body.startsWith("!sticker")) {
    try {
      let targetMsg = msg;
  
      // Se estiver respondendo uma imagem
      if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        if (!quoted.hasMedia) {
          return msg.reply("⚠️ A mensagem citada não tem imagem.");
        }
        targetMsg = quoted;
      } else if (!msg.hasMedia) {
        return msg.reply("⚠️ Envie uma imagem com legenda *!sticker* ou responda uma imagem com esse comando.");
      }
  
      // Criação do sticker
      const stickerBuffer = await createSticker(targetMsg);
  
      const media = new MessageMedia(
        "image/webp",
        stickerBuffer.toString("base64"),
        "sticker.webp"
      );
  
      await client.sendMessage(msg.from, media, {
        sendMediaAsSticker: true,
        stickerName: "Zapito bot",
        stickerAuthor: "Zapito bot",
      });
  
    } catch (error) {
      logError(error, `sticker command`);
      msg.reply("❌ Erro ao criar figurinha: " + error.message);
    }
    return;
  }
  
      
    
    // insta
    if (body.startsWith("!insta ")) {
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
      } finally {
        if (tempFilePath) await deleteFile(tempFilePath);
      }

      return;
    }

    // Outros comandos
    switch (body) {
        case "!help":
            return msg.reply(
              `📚 *Comandos Disponíveis:*\n\n` +
              `!help - Ajuda\n` +
              `!info - Informações do bot\n` +
              `!ping - Teste de conexão\n` +
              `!sticker - Criar figurinha (responda/mande uma imagem)\n` +
              `!insta [url] - Baixar vídeo do Instagram`
            );
      case "!info":
        return msg.reply(
            `🤖 *Zapito Bot*\n` +
            `Versão: 1.9.1\n` +
            `- Criação de stickers HD\n` +
            `- Download de vídeos do Instagram\n` +
            `- Sistema de logs`
          );
    }
  } catch (error) {
    logError(error, "messageHandler");
  }
}

module.exports = { handleMessage };
