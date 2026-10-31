const fs = require("fs");
const path = require("path");

function getGoogleOAuthConfig() {
  const configPath = path.join(process.cwd(), "google-oauth-config.json");
  let cfg = {};
  if (fs.existsSync(configPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {}
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || cfg.client_id || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || cfg.client_secret || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || cfg.redirect_uri || "http://localhost:8877",
    channelEmail: process.env.GOOGLE_CHANNEL_EMAIL || cfg.channel_email || "xezman88@gmail.com"
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    let payload = req.body || {};
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        payload = {};
      }
    }
    const googleCfg = getGoogleOAuthConfig();
    const tokenPath = path.join(process.cwd(), "api", "youtube-token.json");
    let refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!refreshToken && fs.existsSync(tokenPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
        refreshToken = raw.refresh_token;
      } catch (e) {}
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Channel YouTube belum diotorisasi di backend. Kunci permanen belum tersedia."
      });
    }

    // Refresh token akses Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleCfg.clientId,
        client_secret: googleCfg.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }).toString()
    });

    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      return res.status(500).json({
        success: false,
        error: "Gagal me-refresh token akses: " + (tokenJson.error_description || tokenJson.error)
      });
    }

    // Dapatkan Origin browser pemanggil untuk mengaktifkan izin CORS di Google Upload Endpoint
    let clientOrigin = payload.clientOrigin || req.headers.origin || req.headers.referer || "https://pkm-five.vercel.app";
    try {
      if (clientOrigin.startsWith("http")) {
        clientOrigin = new URL(clientOrigin).origin;
      }
    } catch (e) {
      clientOrigin = "https://pkm-five.vercel.app";
    }

    // Buat Resumable Upload Session di YouTube (DENGAN Origin terdaftar agar CORS browser diizinkan)
    const ytRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(payload.fileSize || 0),
        "X-Upload-Content-Type": payload.fileType || "video/mp4",
        "Origin": clientOrigin
      },
      body: JSON.stringify({
        snippet: {
          title: payload.title || "Materi SMPN 7 Tangsel",
          description: payload.description || "Materi Pembelajaran UPTD SMP Negeri 7 Kota Tangerang Selatan.",
          categoryId: "27"
        },
        status: {
          privacyStatus: "unlisted",
          selfDeclaredMadeForKids: false
        }
      })
    });

    const uploadUrl = ytRes.headers.get("Location");
    if (!uploadUrl) {
      const errText = await ytRes.text();
      return res.status(500).json({ success: false, error: "YouTube API error: " + errText });
    }

    return res.status(200).json({ success: true, uploadUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
