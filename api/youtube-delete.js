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
    redirectUri: process.env.GOOGLE_REDIRECT_URI || cfg.redirect_uri || "https://pkm-five.vercel.app",
    channelEmail: process.env.GOOGLE_CHANNEL_EMAIL || cfg.channel_email || "xezman88@gmail.com"
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Verifikasi Otorisasi Dewan Guru sebelum mengizinkan penghapusan video YouTube
  const TEACHER_AUTH_TOKEN = process.env.TEACHER_AUTH_TOKEN || "smpn7-guru-auth-token-2026";
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

  if (token !== TEACHER_AUTH_TOKEN) {
    return res.status(401).json({
      success: false,
      error: "Akses ditolak: Operasi hapus YouTube memerlukan otorisasi resmi Dewan Guru SMPN 7."
    });
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
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

    const youtubeVideoId = (payload.youtubeVideoId || payload.videoId || "").trim();
    if (!youtubeVideoId) {
      return res.status(400).json({ success: false, error: "ID video YouTube wajib disertakan." });
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
        error: "Channel YouTube belum diotorisasi di backend."
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

    // Panggil Endpoint YouTube Data API v3 untuk Menghapus Video
    const deleteRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(youtubeVideoId)}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${tokenJson.access_token}`,
        "Accept": "application/json"
      }
    });

    if (deleteRes.status === 204) {
      console.log(`[YOUTUBE DELETE SUKSES] Video ${youtubeVideoId} berhasil dihapus permanen dari channel YouTube.`);
      return res.status(200).json({
        success: true,
        message: `Video ${youtubeVideoId} berhasil dihapus permanen dari channel YouTube.`
      });
    }

    if (deleteRes.status === 404) {
      // 404 berarti video sudah tidak ada di YouTube atau sudah pernah dihapus
      return res.status(200).json({
        success: true,
        message: "Video tidak ditemukan di channel YouTube atau sudah dihapus sebelumnya."
      });
    }

    if (deleteRes.status === 403) {
      // 403 berarti video pihak ketiga / bukan milik channel sekolah kita
      console.log(`[YOUTUBE DELETE INFO] Video ${youtubeVideoId} bukan milik channel resmi sekolah (video pihak ketiga). Penghapusan YouTube dilewati.`);
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Video merupakan milik pihak ketiga (URL eksternal). Penghapusan YouTube fisik dilewati dengan aman."
      });
    }

    const errText = await deleteRes.text();
    console.warn(`[YOUTUBE DELETE WARNING] Status ${deleteRes.status}:`, errText);
    return res.status(deleteRes.status).json({
      success: false,
      status: deleteRes.status,
      error: "Respon YouTube API: " + errText
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

