module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Otorisasi Dewan Guru
  const TEACHER_AUTH_TOKEN = process.env.TEACHER_AUTH_TOKEN || "smpn7-guru-auth-token-2026";
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

  if (token !== TEACHER_AUTH_TOKEN) {
    return res.status(401).json({
      success: false,
      error: "Akses ditolak: Operasi ini memerlukan otorisasi resmi Dewan Guru SMPN 7."
    });
  }

  // Vercel Serverless environment: filesystem ephemeral / read-only
  return res.status(400).json({
    success: false,
    error: "Lingkungan Vercel Serverless tidak mendukung penyimpanan berkas video lokal besar. Gunakan fitur 'Direct Upload ke Channel YouTube Sekolah' atau jalankan server lokal SMPN 7 (server.js)."
  });
};

