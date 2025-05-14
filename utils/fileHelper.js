const fs = require("fs");
const fsPromises = fs.promises;
const { TEMP_DIR } = require("../config");

async function ensureTempDir() {
  await fsPromises.mkdir(TEMP_DIR, { recursive: true });
}

async function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    await fsPromises.unlink(filePath);
  }
}

module.exports = { ensureTempDir, deleteFile };
