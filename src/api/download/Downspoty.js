const fetch = require("node-fetch");

async function scrapeSpotify(url) {
  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": "\"Android\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    Referer: "https://spotifydownload.org/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  // Step 1 — Metadata Spotify
  const meta = await fetch(
    `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`,
    { headers }
  );
  const metaJson = await meta.json();

  const result = metaJson.result;
  const trackId = result.type === "album" ? result.tracks[0].id : result.id;

  // Step 2 — Convert ke MP3
  const convert = await fetch(
    `https://api.fabdl.com/spotify/mp3-convert-task/${result.gid}/${trackId}`,
    { headers }
  );
  const convertJson = await convert.json();

  const tid = convertJson.result.tid;

  // Step 3 — Ambil link download
  const progress = await fetch(
    `https://api.fabdl.com/spotify/mp3-convert-progress/${tid}`,
    { headers }
  );
  const progressJson = await progress.json();

  return {
    title: result.name,
    type: result.type,
    artis: result.artists,
    durasi:
      result.type === "album"
        ? result.tracks[0].duration_ms
        : result.duration_ms,
    image: result.image,
    download: `https://api.fabdl.com${progressJson.result.download_url}`,
    status: progressJson.result.status
  };
}

module.exports = function (app) {
  // ==========================
  // 📌 GET /download/spotify
  // ==========================
  app.get("/download/spotify", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi dan harus berupa string."
      });
    }

    try {
      const result = await scrapeSpotify(url.trim());

      res.json({
        status: true,
        creator: "RyzenThawne",
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Gagal memproses permintaan Spotify.",
        error: e.message || e,
      });
    }
  });

  // ==========================
  // 📌 POST /download/spotify
  // ==========================
  app.post("/download/spotify", async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi dan harus berupa string."
      });
    }

    try {
      const result = await scrapeSpotify(url.trim());

      res.json({
        status: true,
        creator: "RyzenThawne",
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        message: "Gagal memproses permintaan Spotify.",
        error: e.message || e,
      });
    }
  });
};
