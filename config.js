const path = require("path");

module.exports = {
  TEMP_DIR: path.join(__dirname, "temp"),
  LOG_FILE: path.join(__dirname, "error.log"),
  AUTH_PATH: "./auth",
};
