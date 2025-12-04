export function requireAdminKey(req, res, next) {
  const adminKey = req.header("x-admin-api-key");
  if (!adminKey) {
    return res.status(401).json({ error: "Admin key required" });
  }

  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: "Forbidden: Invalid admin key" });
  }
  next();
}
