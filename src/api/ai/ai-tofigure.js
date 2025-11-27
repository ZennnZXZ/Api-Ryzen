const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
const { fileTypeFromBuffer } = require("file-type");

const BASE_URL = "https://ai-apps.codergautam.dev";

// ==== Util kecil ====
function acakName(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ==== Auto Register ====
async function autoregist() {
  const uid = crypto.randomBytes(12).toString("hex");
  const email = `figure${Date.now()}@nyahoo.com`;

  const payload = {
    uid,
    email,
    displayName: acakName(),
    photoURL: "https://i.pravatar.cc/150",
    appId: "photogpt",
  };

  const res = await axios.post(`${BASE_URL}/photogpt/create-user`, payload, {
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "okhttp/4.9.2",
    },
  });

  if (res.data?.success) return uid;
  throw new Error("Register gagal: " + JSON.stringify(res.data));
}

// ==== img2img ====
async function img2img(imageBuffer, prompt, mime) {
  const uid = await autoregist();

  const ext = (await fileTypeFromBuffer(imageBuffer))?.ext || "jpg";
  const form = new FormData();
  form.append("image", imageBuffer, { filename: `input.${ext}`, contentType: mime || `image/${ext}` });
  form.append("prompt", prompt);
  form.append("userId", uid);

  const uploadRes = await axios.post(`${BASE_URL}/photogpt/generate-image`, form, {
    headers: {
      ...form.getHeaders(),
      accept: "application/json",
      "user-agent": "okhttp/4.9.2",
      "accept-encoding": "gzip",
    },
    maxBodyLength: Infinity,
  });

  if (!uploadRes.data?.success) throw new Error(JSON.stringify(uploadRes.data));

  const { pollingUrl } = uploadRes.data;

  let status = "pending";
  let resultUrl = null;

  while (status !== "Ready") {
    const pollRes = await axios.get(pollingUrl, {
      headers: { accept: "application/json", "user-agent": "okhttp/4.9.2" },
    });
    status = pollRes.data?.status;

    if (status === "Ready") {
      resultUrl = pollRes.data?.result?.url;
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (!resultUrl) throw new Error("Gagal mendapatkan hasil gambar.");

  const resultImg = await axios.get(resultUrl, { responseType: "arraybuffer" });
  return Buffer.from(resultImg.data);
}

// === PROMPT ===
const FIGURE_PROMPT = `
Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment.
The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base.
The computer screen shows the Zbrush modeling process of the figurine.
Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.
-- Render the scene in LANDSCAPE orientation (16:9 aspect ratio), wide-angle composition
`.trim();

// ===========================
// ==  EXPRESS ENDPOINT     ==
// ===========================
module.exports = function (app) {

  app.post("/api/tofigure2", async (req, res) => {
    try {
      const { promptOverride, url } = req.body || {};
      const prompt = promptOverride || FIGURE_PROMPT;

      let imageBuffer = null;
      let mime = "";

      // Jika URL diberikan
      if (url && /^https?:\/\//i.test(url)) {
        try {
          const r = await axios.get(url, { responseType: "arraybuffer" });
          imageBuffer = Buffer.from(r.data);
          const ft = await fileTypeFromBuffer(imageBuffer);
          mime = ft ? `image/${ft.ext}` : r.headers["content-type"] || "image/jpeg";
        } catch (e) {
          return res.json({ status: false, message: "Gagal download gambar dari URL" });
        }
      } else {
        return res.json({ status: false, message: "URL gambar tidak ditemukan." });
      }

      const result = await img2img(imageBuffer, prompt, mime);

      res.set({
        "Content-Type": "image/jpeg",
        "Content-Disposition": "inline; filename=figure.jpg",
      });

      return res.send(result);

    } catch (err) {
      console.error("API tofigure2 ERROR:", err);
      return res.json({
        status: false,
        message: "Terjadi kesalahan.",
        error: err?.message,
      });
    }
  });
};
