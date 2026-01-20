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
  res.redirect(302, `/zombie?${req.params.num}`);
});

// /zombie?1234  или /zombie?num=1234
app.get("/zombie", async (req, res) => {
  let browser;
  try {
    let num = req.query.num ?? Object.keys(req.query)[0];
    if (!num || !/^\d+$/.test(String(num))) {
      return res.status(400).type("text/plain").send("Bad number");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const oldTitle = await page.title();

    // Ищем кнопку максимально универсально
    const btn =
      (await page.$("button")) ||
      (await page.$("input[type=button]")) ||
      (await page.$("input[type=submit]"));

    if (!btn) throw new Error("Button not found");

    await btn.click();

    // ✅ Главное: ждём пока title реально изменится
    await page.waitForFunction(
      (t) => document.title && document.title !== t,
      oldTitle,
      { timeout: 5000 }
    );

    const newTitle = await page.title();

    res.type("text/plain").send(newTitle);
  } catch (e) {
    res.status(500).type("text/plain").send("ERR: " + e.message);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log("Listening on", PORT));
