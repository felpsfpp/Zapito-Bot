const fs = require("fs");
const { LOG_FILE } = require("../config");

function logError(error, context = "") {
  const timestamp = new Date().toLocaleString("pt-BR");
  const logEntry = `[${timestamp}] ERRO: ${error.message}\nContexto:\n ${context}\nStack:\n ${error.stack}\n\n\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.error(logEntry);
}

module.exports = { logError };
