const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

  if (req.method === "POST") {
    // Di Vercel Serverless environment, local filesystem bersifat ephemeral / read-only.
    // Client akan menyimpan di IndexedDB & LocalStorage secara otomatis sebagai offline-first fallback.
    return res.status(200).json({
      status: "ok",
      message: "Materi berhasil disinkronkan ke sesi aktif.",
      note: "Untuk persistensi multi-user cloud permanen, dapat diintegrasikan dengan Supabase."
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};

