const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const crypto = require("crypto");
const upload = multer();
const { fileTypeFromBuffer } = require("file-type");

const app = express();
app.use(express.json());

const BASE_URL = "https://ai-apps.codergautam.dev";

// =============== UPLOAD KE CATBOX TANPA KEY ===============
async function uploadCatbox(buffer) {
  const ft = await fileTypeFromBuffer(buffer);
  const form = new FormData();

  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, {
    filename: `upload.${ft?.ext || "jpg"}`,
    contentType: ft?.mime || "image/jpeg"
  });

  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity
  });

  if (typeof res.data === "string" && res.data.startsWith("https://"))
    return res.data;

  throw new Error("Catbox upload failed: " + res.data);
}

// =============== AUTOREGISTER USER ===============
async function autoregist() {
  const uid = crypto.randomBytes(12).toString("hex");
  const email = `figure${Date.now()}@nyahoo.com`;

  const payload = {
    uid,
    email,
    displayName: "figureUser",
    photoURL: "https://i.pravatar.cc/150",
    appId: "photogpt"
  };

  const res = await axios.post(`${BASE_URL}/photogpt/create-user`, payload, {
    headers: {
      "content-type": "application/json",
      "accept": "application/json",
      "user-agent": "okhttp/4.9.2"
    }
  });

  if (res.data?.success) return uid;
  throw new Error("Register gagal: " + JSON.stringify(res.data));
}

// =============== PROMPT FIGURE ===============
const FIGURE_PROMPT = `
Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment.
The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base.
The computer screen shows the Zbrush modeling process of the figurine.
Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.
-- Render the scene in LANDSCAPE orientation (16:9 aspect ratio), wide-angle composition
`.trim();

// =============== ROUTE: /ai/tofigure ===============
app.post("/tools/tofigure", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image tidak ditemukan. Kirim file image." });

    const buffer = req.file.buffer;

    // 1. Upload ke Catbox
    const catboxUrl = await uploadCatbox(buffer);

    // 2. Daftar auto user
    const uid = await autoregist();

    // 3. Kirim ke API figure
    const form = new FormData();
    form.append("image", buffer, { filename: "input.jpg", contentType: "image/jpeg" });
    form.append("prompt", FIGURE_PROMPT);
    form.append("userId", uid);

    const up = await axios.post(`${BASE_URL}/photogpt/generate-image`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity
    });

    if (!up.data?.success)
      throw new Error("Gagal generate: " + JSON.stringify(up.data));

    const { pollingUrl } = up.data;

    // 4. Polling untuk hasil
    let status = "pending";
    let resultUrl = null;

    while (status !== "Ready") {
      const poll = await axios.get(pollingUrl, {
        headers: { "accept": "application/json" }
      });

      status = poll.data?.status;
      if (status === "Ready") {
        resultUrl = poll.data?.result?.url;
        break;
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    if (!resultUrl) throw new Error("Gagal mengambil hasil image.");

    const finalImg = await axios.get(resultUrl, { responseType: "arraybuffer" });

    res.set("Content-Type", "image/jpeg");
    return res.send(Buffer.from(finalImg.data));

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// =============== START SERVER ===============
app.listen(3000, () => console.log("Server jalan di http://localhost:3000"));
