const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { AUTH_PATH } = require("./config");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("auth_failure", () => console.log("❌ Falha na autenticação"));
client.on("authenticated", () => console.log("✅ Autenticado com sucesso"));
client.on("disconnected", () => console.log("🔌 Bot desconectado"));
client.on("ready", () => console.log("🤖 Bot iniciado com sucesso"));

module.exports = client;
