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

// /zombie?1234  и /zombie?num=1234
app.get("/zombie", async (req, res) => {
  try {
    let num = null;

    // /zombie?num=1234
    if (req.query.num) num = String(req.query.num);

    // /zombie?1234  (ключ запроса = "1234")
    if (!num) {
      const keys = Object.keys(req.query);
      if (keys.length) num = String(keys[0]);
    }

    if (!num || !/^\d+$/.test(num)) {
      return res.status(400).type("text/plain").send("Bad number parameter");
    }

    const url = `https://kodaktor.ru/g/d7290da?${num}`;

    const browser = await chromium.launch({
      headless: true,
      // в docker-playwright sandbox обычно ок, но пусть будет безопаснее
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Надежный клик: пробуем разные варианты
    const tryClick = async (selector) => {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        return true;
      }
      return false;
    };

    let clicked =
      (await tryClick("button")) ||
      (await tryClick("input[type=button]")) ||
      (await tryClick("input[type=submit]"));

    if (!clicked) {
      // последний шанс: клик по любому элементу с onclick
      const anyOnclick = await page.$("[onclick]");
      if (anyOnclick) {
        await anyOnclick.click();
        clicked = true;
      }
    }

    if (!clicked) throw new Error("No clickable control found");

    // ждём обновления title
    await page.waitForTimeout(300);

    const title = await page.title();
    await browser.close();

    res.type("text/plain").send(title);
  } catch (e) {
    res.status(500).type("text/plain").send("ERR: " + e.message);
  }
});

app.listen(PORT, () => console.log("Listening on", PORT));
