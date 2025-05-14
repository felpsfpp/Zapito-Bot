const client = require("./client");
const { handleMessage } = require("./handlers/messageHandler");
const { ensureTempDir } = require("./utils/fileHelper");
const { logError } = require("./utils/logger");

(async () => {
  try {
    // Garante existência da pasta temporária
    await ensureTempDir();

    // Registra handler de mensagens
    client.on("message", async (msg) => {
      await handleMessage(client, msg);
    });

    // Inicializa o cliente
    await client.initialize();
  } catch (error) {
    logError(error, "Inicialização");
    process.exit(1);
  }

  // Tratamento de erros não capturados
  process.on("unhandledRejection", (error) => logError(error, "unhandledRejection"));
  process.on("uncaughtException", (error) => {
    logError(error, "uncaughtException");
    process.exit(1);
  });
})();
