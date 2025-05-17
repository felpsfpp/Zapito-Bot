const { downloadInstaMedia } = require("../repositories/instaRepository");
const { logError } = require("../utils/logger");

async function getInstaMedia(url) {
  try {
    return await downloadInstaMedia(url);
  } catch (error) {
    logError(error, "instaService");
    throw new Error("Erro ao obter vídeo do Instagram: " + error.message);
  }
}

module.exports = { getInstaMedia };
