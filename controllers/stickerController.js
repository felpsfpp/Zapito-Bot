const { createSticker: generateSticker } = require("../services/stickerService");

async function createSticker(msg) {
  return await generateSticker(msg);
}

module.exports = { createSticker };
