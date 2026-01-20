const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

const LOGIN = "vulkan21";

app.get("/login", (req, res) => {
  res.type("text/plain").send(LOGIN);
});

// /zombie/1234
app.get("/zombie/:num", async (req, res) => {
  return handleZombie(req.params.num, res);
});

// /zombie?num=1234  и на всякий случай /zombie?1234
app.get("/zombie", async (req, res) => {
  const num = req.query.num ?? Object.keys(req.query)[0];
  return handleZombie(num, res);
});

async function handleZombie(num, res) {
  if (!num || !/^\d+$/.test(String(num))) {
    res.status(400).type("text/plain").send("Bad number parameter");
    return;
  }

  const url = `https://kodaktor.ru/g/d7290da?${num}`;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Если кнопка одна — кликаем первую кнопку.
    // Если на странице конкретный селектор — можно заменить на него.
    await page.click("button");

    // ждём, чтобы заголовок успел поменяться после клика
    await page.waitForTimeout(150);

    const title = await page.title();
    res.type("text/plain").send(title);
  } catch (e) {
    res.status(500).type("text/plain").send(`Error: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
