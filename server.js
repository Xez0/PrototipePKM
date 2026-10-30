// ==========================================================================
// SERVER BACKEND OTOMATIS: REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN
// Node.js Native HTTP Server (Tanpa Dependensi Tambahan / Zero-Dependency)
// Menyediakan REST API Penyimpanan Otomatis (/api/videos, /api/upload)
// & Static File Server dengan Dukungan Video Streaming (HTTP 206 Range)
// ==========================================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT || process.argv[2] || 8877, 10);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "videos.json");

// Pastikan direktori data & uploads selalu ada
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// MIME Types Baku
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

// Helper: Baca Data Video dari Disk
function readVideos() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[BACKEND ERROR] Gagal membaca data/videos.json:", err.message);
    return [];
  }
}

// Helper: Simpan Data Video ke Disk
function writeVideos(videos) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[BACKEND ERROR] Gagal menulis data/videos.json:", err.message);
    return false;
  }
}

// Helper: Response JSON
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });
  res.end(JSON.stringify(data));
}

// Helper: Parse Body JSON
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString("utf8");
      if (body.length > 50 * 1024 * 1024) { // limit 50MB
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON: " + e.message));
      }
    });
    req.on("error", reject);
  });
}

// Helper: Handle Upload File Video (Multipart / Binary Stream)
function handleFileUpload(req, res) {
  const contentType = req.headers["content-type"] || "";
  
  if (contentType.includes("multipart/form-data")) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return sendJson(res, 400, { success: false, error: "Invalid multipart boundary" });
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const chunks = [];
    
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const boundaryBuf = Buffer.from(`--${boundary}`);
      
      // Cari file part
      let startIndex = buffer.indexOf(boundaryBuf);
      if (startIndex === -1) {
        return sendJson(res, 400, { success: false, error: "No parts in multipart" });
      }

      const headerEndToken = Buffer.from("\r\n\r\n");
      const headerStart = startIndex + boundaryBuf.length + 2; // skip \r\n
      const headerEnd = buffer.indexOf(headerEndToken, headerStart);
      if (headerEnd === -1) {
        return sendJson(res, 400, { success: false, error: "Malformed multipart headers" });
      }

      const headerStr = buffer.slice(headerStart, headerEnd).toString("utf8");
      const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
      const originalName = filenameMatch ? filenameMatch[1] : "video-materi.mp4";
      
      const fileDataStart = headerEnd + 4;
      const nextBoundary = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), fileDataStart);
      const fileDataEnd = nextBoundary !== -1 ? nextBoundary : buffer.length - 4;
      
      const fileContent = buffer.slice(fileDataStart, fileDataEnd);
      
      // Buat nama file unik dan aman di server
      const ext = path.extname(originalName) || ".mp4";
      const safeName = `video-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const savePath = path.join(UPLOADS_DIR, safeName);
      
      fs.writeFileSync(savePath, fileContent);
      const sizeMB = (fileContent.length / (1024 * 1024)).toFixed(1) + " MB";
      
      console.log(`[UPLOAD SUKSES] Berkas tersimpan di server: ${safeName} (${sizeMB})`);
      
      return sendJson(res, 201, {
        success: true,
        url: `/uploads/${safeName}`,
        fileName: originalName,
        fileSize: sizeMB,
        storedAs: safeName
      });
    });
  } else {
    // Binary raw upload
    const ext = ".mp4";
    const safeName = `video-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const savePath = path.join(UPLOADS_DIR, safeName);
    const writeStream = fs.createWriteStream(savePath);
    
    let totalBytes = 0;
    req.on("data", chunk => {
      totalBytes += chunk.length;
      writeStream.write(chunk);
    });
    
    req.on("end", () => {
      writeStream.end();
      const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1) + " MB";
      console.log(`[UPLOAD RAW SUKSES] ${safeName} (${sizeMB})`);
      sendJson(res, 201, {
        success: true,
        url: `/uploads/${safeName}`,
        fileName: safeName,
        fileSize: sizeMB,
        storedAs: safeName
      });
    });
  }
}

// Router Utama HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  // ==========================================================================
  // API ROUTES (/api/*)
  // ==========================================================================

  // 1. Health check & status server
  if (pathname === "/api/status" && method === "GET") {
    const videos = readVideos();
    return sendJson(res, 200, {
      success: true,
      server: "Backend Repositori Video SMPN 7 Tangerang Selatan",
      status: "online",
      version: "2.0.0",
      totalVideos: videos.length,
      storageMode: "server-filesystem-storage",
      timestamp: new Date().toISOString()
    });
  }

  // 2. GET Semua Video (/api/videos)
  if (pathname === "/api/videos" && method === "GET") {
    const videos = readVideos();
    return sendJson(res, 200, {
      success: true,
      count: videos.length,
      data: videos
    });
  }

  // 3. POST Tambah Video Baru (/api/videos)
  if (pathname === "/api/videos" && method === "POST") {
    try {
      const payload = await parseJsonBody(req);
      if (!payload.title) {
        return sendJson(res, 400, { success: false, error: "Judul materi wajib diisi" });
      }

      const videos = readVideos();
      const newId = payload.id || `smpn7-custom-${Date.now()}`;
      
      const newVideo = {
        ...payload,
        id: newId,
        createdAt: new Date().toISOString(),
        publishedAt: payload.publishedAt || new Date().toISOString()
      };

      // Tambahkan ke depan (terbaru muncul di atas)
      videos.unshift(newVideo);
      writeVideos(videos);

      console.log(`[API POST] Materi baru otomatis tersimpan di server: "${newVideo.title}" (${newVideo.subject})`);
      return sendJson(res, 201, { success: true, data: newVideo });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 4. PUT Update Video (/api/videos/:id)
  if (pathname.startsWith("/api/videos/") && method === "PUT") {
    const id = pathname.replace("/api/videos/", "").trim();
    try {
      const payload = await parseJsonBody(req);
      const videos = readVideos();
      const idx = videos.findIndex(v => v.id === id);
      
      if (idx === -1) {
        return sendJson(res, 404, { success: false, error: "Materi video tidak ditemukan" });
      }

      videos[idx] = {
        ...videos[idx],
        ...payload,
        id,
        updatedAt: new Date().toISOString()
      };

      writeVideos(videos);
      console.log(`[API PUT] Materi diperbarui di server: "${videos[idx].title}" (ID: ${id})`);
      return sendJson(res, 200, { success: true, data: videos[idx] });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 5. DELETE Hapus Video (/api/videos/:id)
  if (pathname.startsWith("/api/videos/") && method === "DELETE") {
    const id = pathname.replace("/api/videos/", "").trim();
    const videos = readVideos();
    const idx = videos.findIndex(v => v.id === id);

    if (idx === -1) {
      return sendJson(res, 404, { success: false, error: "Materi video tidak ditemukan" });
    }

    const deleted = videos.splice(idx, 1)[0];
    writeVideos(videos);

    // Jika video lokal berada di folder uploads, hapus filenya dari disk
    if (deleted.embedUrl && deleted.embedUrl.startsWith("/uploads/")) {
      const localFilePath = path.join(ROOT_DIR, deleted.embedUrl);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
          console.log(`[CLEANUP] File video terhapus dari server: ${localFilePath}`);
        } catch (e) {}
      }
    }

    console.log(`[API DELETE] Materi dihapus dari server: "${deleted.title}" (ID: ${id})`);
    return sendJson(res, 200, { success: true, deletedId: id });
  }

  // 6. POST Upload File Video (/api/upload)
  if (pathname === "/api/upload" && method === "POST") {
    return handleFileUpload(req, res);
  }

  // 7. POST Reset ke Data Default Resmi (/api/reset)
  if (pathname === "/api/reset" && method === "POST") {
    try {
      const dataJs = fs.readFileSync(path.join(ROOT_DIR, "js", "data.js"), "utf8");
      const match = dataJs.match(/const INITIAL_VIDEO_DATA = (\[[\s\S]*?\]);\s*window/);
      if (match) {
        const defaultData = eval(match[1]);
        writeVideos(defaultData);
        console.log(`[API RESET] Repositori dikembalikan ke ${defaultData.length} materi resmi.`);
        return sendJson(res, 200, { success: true, count: defaultData.length, data: defaultData });
      }
    } catch (e) {
      return sendJson(res, 500, { success: false, error: "Gagal reset: " + e.message });
    }
  }

  // ==========================================================================
  // STATIC FILE SERVING (index.html, css, js, assets, uploads)
  // ==========================================================================
  let filePath = path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname);

  // Mencegah directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Jika berkas tidak ditemukan, sajikan 404
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`
        <!DOCTYPE html>
        <html lang="id">
        <head><title>404 - Halaman Tidak Ditemukan</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h2>Halaman atau Berkas Tidak Ditemukan</h2>
          <p>Berkas <code>${pathname}</code> tidak tersedia di server Repositori SMPN 7.</p>
          <a href="/">Kembali ke Beranda Repositori</a>
        </body>
        </html>
      `);
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Dukungan HTTP 206 Partial Content (Streaming Range Video)
    const range = req.headers.range;
    if (range && (ext === ".mp4" || ext === ".webm" || ext === ".mkv")) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      const fileStream = fs.createReadStream(normalizedPath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType
      });
      return fileStream.pipe(res);
    }

    // Response Normal File Statis
    res.writeHead(200, {
      "Content-Length": stats.size,
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    fs.createReadStream(normalizedPath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
======================================================================
  SERVER REPOSITORI VIDEO SMPN 7 TANGERANG SELATAN (AKTIF)
======================================================================
  - Web & REST API : http://127.0.0.1:${PORT}
  - Lokasi Data    : ${DB_FILE}
  - Lokasi Upload  : ${UPLOADS_DIR}
  - Penyimpanan    : Otomatis tersinkronisasi ke server (Tanpa manual backup)
======================================================================
  Tekan Ctrl+C untuk menghentikan server.
  `);
});
