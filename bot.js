process.env.DISABLE_WEBCACHE = "1";

const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const TEMP_DIR = path.join(__dirname, "temp");

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const sharp = require("sharp");
const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Crie a pasta temporária no início da execução
(async () => {
  await fsPromises.mkdir(TEMP_DIR, { recursive: true });
})();

// Configurações
const LOG_FILE = path.join(__dirname, "error.log");
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./auth" }),
  webVersionCache: { type: "remote", remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html", },
});

// Sistema de logs
function logError(error, context = "") {
  const timestamp = new Date().toLocaleString("pt-BR");
  const logEntry = `[${timestamp}] ERRO: ${error.message}\nContexto: ${context}\nStack: ${error.stack}\n\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.error(logEntry);
}

// Inicialização
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true }) // Gera QRcode
});

client.on("auth_failure", () => {
  console.log("🤖 FALHA NA AUTENTICAÇÃO");
});

client.on("authenticated", () => {
  console.log("🤖 Autenticado com sucesso");
});

client.on("disconnected", () => {
  console.log("🤖 Bot Desconectado!");
});
client.on("ready", () => {
  console.log("🤖 Bot iniciado com sucesso!")
});

// Função para download do Instagram
const fetch = require("node-fetch");
const { getSystemErrorMessage } = require("util");
const { Browser } = require("puppeteer");

async function getInstaMedia(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.setJavaScriptEnabled(true);

    // Serviços atualizados e verificados
    const services = ["https://instasave.website"];

    for (const service of services) {
      try {
        console.log(`Tentando serviço: ${service}`);
        await page.goto(service, { waitUntil: "networkidle2", timeout: 30000 });

        // Preencher formulário específico para cada serviço
        const inputSelector = await page.waitForSelector('input[name="url"]', {
          timeout: 5000,
        });
        await inputSelector.type(url);
        await page.keyboard.press("Enter");

        // Esperar pelo link real do vídeo
        const videoSelector = await page.waitForSelector(
          ".download-items__btn a",
          {
            timeout: 30000,
            visible: true,
          }
        );

        // Obter URL direta do vídeo
        const videoUrl = await page.evaluate((el) => {
          if (el.tagName === "VIDEO" || el.tagName === "SOURCE") {
            return el.src;
          }
          return el.href;
        }, videoSelector);

        // Verificar se é um link válido
        if (!videoUrl) {
          throw new Error("Link de vídeo inválido");
        }

        console.log("URL do vídeo obtido");
        return videoUrl;
      } catch (error) {
        console.log(`Falha no serviço ${service}:`, error.message);
        await page.reload({ waitUntil: "networkidle2", timeout: 10000 });
        continue;
      }
    }
    throw new Error("Todos os serviços falharam");
  } catch (error) {
    throw new Error(`Erro no download: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Função para criação de stickers
async function createSticker(msg) {
  try {
    const media = await msg.downloadMedia();

    if (!media?.data) {
      throw new Error("Mídia não encontrada");
    }

    const buffer = Buffer.from(media.data.split(",")[1], "base64");

    return sharp(buffer)
      .resize(512, 512)
      .webp({ quality: 90, lossless: true })
      .toBuffer();
  } catch (error) {
    logError(error, `createSticker: ${msg.id._serialized}`);
    throw new Error("Erro ao processar: " + error.message);
  }
}

// Handler de mensagens
client.on("message", async (msg) => {
  try {
    const body = msg.body.toLowerCase().trim();

    // Comando de sticker
    if (body.startsWith("!sticker")) {
      try {
        const targetMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage() : msg;

        if (!targetMsg.hasMedia) {
          return msg.reply("⚠️ Responda ou marque uma imagem");
        }

        const stickerBuffer = await createSticker(targetMsg);
        await client.sendMessage(
          msg.from,
          new MessageMedia(
            "image/webp",
            stickerBuffer.toString("base64"),
            "sticker.webp"
          ),
          {
            sendMediaAsSticker: true,
            stickerName: "Zapito bot",
            stickerAuthor: "Zapito bot",
          }
        );
      } catch (error) {
        msg.reply("❌ Erro: " + error.message);
      }
      return;
    }

    // Comando Instagram
    if (body.startsWith("!insta ")) {
      const url = msg.body.split(" ")[1];

      if (!url?.match(/https?:\/\/(www\.)?instagram\.com\/.+/)) {
        return msg.reply("⚠️ Formato de URL inválido");
      }

      let tempFilePath = null;

      try {
        await msg.reply("🔍 Processando seu vídeo...");

        const videoUrl = await getInstaMedia(url);

        const filename = `instagram_${Date.now()}.mp4`;
        tempFilePath = path.join(TEMP_DIR, filename);

        // Faz o download do vídeo usando stream
        const response = await axios({
          method: "get",
          url: videoUrl,
          responseType: "stream",
          timeout: 30000,
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        // Espera o download terminar
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // Verifica se o arquivo foi criado
        const stats = fs.statSync(tempFilePath);
        if (stats.size === 0) {
          throw new Error("Arquivo de vídeo vazio");
        }

        // Cria MessageMedia do arquivo
        const videoBuffer = await fsPromises.readFile(tempFilePath);
        console.log("Tamanho do vídeo (bytes):", videoBuffer.length);
        const media = new MessageMedia(
          "video/mp4",
          videoBuffer.toString("base64"),
          filename
        );

        // Envia o vídeo
        try {
          await msg.reply("📥 Aqui está seu vídeo:");
          await client.sendMessage(msg.from, media, {
            caption: "Aqui está seu vídeo!",
            sendMediaAsDocument: true, // força envio como documento
            sendVideoAsGif: false, // garante que não tente converter em GIF
          });
        } catch (sendError) {
          logError(sendError, "sendMessage");
          throw new Error("Erro ao enviar vídeo no WhatsApp");
        }
      } catch (error) {
        console.error("Erro completo:", error);
        msg.reply("❌ Falha ao baixar");
      } finally {
        // Apaga o arquivo temporário se existir
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            await fsPromises.unlink(tempFilePath);
            console.log("Arquivo temporário removido:", tempFilePath);
          } catch (err) {
            console.error("Erro ao remover arquivo temporário:", err);
          }
        }
      }
      return;
    }

    // Comandos básicos
    switch (body) {
      case "!help":
        await msg.reply(
          `📚 *Comandos Disponíveis:*\n\n` +
            `!help - Mostra esta ajuda\n` +
            `!info - Informações do bot\n` +
            `!ping - Teste de conexão\n` +
            `!sticker - Criar figurinha (marque/responda uma imagem)\n` +
            `!insta [url] - Baixar vídeo do Instagram`
        );
        break;

      case "!info":
        await msg.reply(
          `🤖 *Bot WhatsApp*\n` +
            `Versão: 5.0\n` +
            `Funcionalidades:\n` +
            `- Criação de stickers HD\n` +
            `- Download de vídeos do Instagram\n` +
            `- Sistema de logs detalhado`
        );
        break;

      case "!ping":
        await msg.reply(`🏓 Pong! Latência: ${Date.now() - msg.timestamp}ms`);
        break;
    }
  } catch (error) {
    logError(error, "messageHandler");
  }
});

// Inicialização segura
client.initialize().catch((error) => {
  logError(error, "Initialization");
  process.exit(1);
});

// Gerenciamento de erros globais
process.on("unhandledRejection", (error) =>
  logError(error, "unhandledRejection")
);
process.on("uncaughtException", (error) => {
  logError(error, "uncaughtException");
  process.exit(1);
});
