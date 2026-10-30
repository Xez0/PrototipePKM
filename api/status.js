module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: "online",
    platform: "Vercel Serverless",
    school: "UPTD SMP Negeri 7 Kota Tangerang Selatan",
    academicYear: "2026/2027",
    timestamp: new Date().toISOString()
  });
};

