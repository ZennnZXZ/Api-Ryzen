const fetch = require("node-fetch");

async function scrapeSpotify(url) {
  const apiURL = `https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(url)}`;

  const resp = await fetch(apiURL, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });

  const json = await resp.json().catch(() => null);

  if (!json || json.status !== true || !json.data) {
    throw new Error("API siputzx gagal mengembalikan data Spotify.");
  }

  return json.data;
}

module.exports = function (app) {
  // ======================
  // GET /download/spotify
  // ======================
  app.get("/download/spotify", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi!"
      });
    }

    try {
      const result = await scrapeSpotify(url.trim());

      res.json({
        status: true,
        creator: "RyzenThawne",
        result,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        creator: "RyzenThawne",
        message: "Gagal memproses permintaan Spotify.",
        error: e.message
      });
    }
  });

  // ======================
  // POST /download/spotify
  // ======================
  app.post("/download/spotify", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi!"
      });
    }

    try {
      const result = await scrapeSpotify(url.trim());

      res.json({
        status: true,
        creator: "RyzenThawne",
        result,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        creator: "RyzenThawne",
        message: "Gagal memproses permintaan Spotify.",
        error: e.message
      });
    }
  });
};
  
