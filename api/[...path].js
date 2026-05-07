import app from "../server/index.js";

export default async function handler(req, res) {
  // Strip the /api prefix before passing to Express
  req.url = "/api/" + (req.query.path ? req.query.path.join("/") : "");
  
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on("finish", resolve);
    res.on("error", reject);
  });
}