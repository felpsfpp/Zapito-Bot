const { MessageMedia } = require("whatsapp-web.js");

const { createSticker } = require("../controllers/stickerController");
const { handleInstaRequest } = require("../controllers/instaController");
const { logError } = require("../utils/logger");

async function handleMessage(client, msg) {
  try {
    const body = msg.body.toLowerCase().trim();

    // sticker
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
      await handleInstaRequest(client, msg);
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
