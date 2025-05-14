const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function getInstaMedia(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (...) Chrome/122");

    const services = ["https://instasave.website"];

    for (const service of services) {
      try {
        await page.goto(service, { waitUntil: "networkidle2", timeout: 30000 });
        const input = await page.waitForSelector('input[name="url"]', { timeout: 5000 });
        await input.type(url);
        await page.keyboard.press("Enter");

        const link = await page.waitForSelector(".download-items__btn a", {
          timeout: 30000,
          visible: true,
        });

        const videoUrl = await page.evaluate(el => el.href || el.src, link);

        if (!videoUrl) throw new Error("Link de vídeo inválido");

        return videoUrl;
      } catch {
        await page.reload({ waitUntil: "networkidle2", timeout: 10000 });
      }
    }

    throw new Error("Todos os serviços falharam");
  } finally {
    await browser.close();
  }
}

module.exports = { getInstaMedia };
