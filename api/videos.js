const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const dataPath = path.join(process.cwd(), "data", "videos.json");

  if (req.method === "GET") {
    try {
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, "utf-8");
        const videos = JSON.parse(fileContent);
        return res.status(200).json({ success: true, status: "ok", data: videos });
      }
      return res.status(200).json({ success: true, status: "ok", data: [] });
    } catch (e) {
      console.error("Error reading videos:", e);
      return res.status(500).json({ error: "Gagal membaca database materi video" });
    }
  }

  if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
    // Verifikasi Otorisasi Dewan Guru
    const TEACHER_AUTH_TOKEN = process.env.TEACHER_AUTH_TOKEN || "smpn7-guru-auth-token-2026";
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    if (token !== TEACHER_AUTH_TOKEN) {
      return res.status(401).json({
        success: false,
        error: "Akses ditolak: Operasi ini memerlukan otorisasi resmi Dewan Guru SMPN 7."
      });
    }

    // Di Vercel Serverless environment, local filesystem bersifat ephemeral / read-only.
    // Client akan menyimpan di Supabase Cloud serta IndexedDB & LocalStorage secara otomatis.
    return res.status(200).json({
      success: true,
      status: "ok",
      message: "Operasi materi berhasil disinkronkan."
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};

