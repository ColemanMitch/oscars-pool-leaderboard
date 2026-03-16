import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchSheetData, getCategories } from "./sheets.js";
import { computeLeaderboard } from "./scoring.js";
import { getWinners, setWinner, addTiedWinner, removeWinner } from "./winners.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "oscars2026";

app.use(cors());
app.use(express.json());

// Auth middleware for admin routes
function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Health check (used by UptimeRobot to keep Render alive)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /api/leaderboard
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const { rows, columns } = await fetchSheetData();
    const winners = getWinners();
    const categoryMap = getCategories(columns);
    const participants = computeLeaderboard(rows, columns, winners);

    res.json({
      participants,
      winners,
      categoriesAnnounced: Object.keys(winners).length,
      totalCategories: categoryMap.size,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to compute leaderboard" });
  }
});

// GET /api/categories
app.get("/api/categories", async (_req, res) => {
  try {
    const { columns } = await fetchSheetData();
    const categoryMap = getCategories(columns);
    const winners = getWinners();

    const categories = Array.from(categoryMap.entries()).map(
      ([name, info]) => ({
        name,
        maxPoints: info.maxPoints,
        nominees: info.nominees,
        winner: winners[name] || null,
      })
    );

    res.json({ categories });
  } catch (err) {
    console.error("Categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/winners
app.post("/api/winners", requireAdmin, (req, res) => {
  const { category, winner } = req.body;
  if (!category || !winner) {
    res.status(400).json({ error: "category and winner are required" });
    return;
  }
  setWinner(category, winner);
  res.json({ success: true, winners: getWinners() });
});

// POST /api/winners/tie — add an additional tied winner to a category
app.post("/api/winners/tie", requireAdmin, (req, res) => {
  const { category, winner } = req.body;
  if (!category || !winner) {
    res.status(400).json({ error: "category and winner are required" });
    return;
  }
  addTiedWinner(category, winner);
  res.json({ success: true, winners: getWinners() });
});

// DELETE /api/winners/:category
app.delete("/api/winners/:category", requireAdmin, (req, res) => {
  const category = decodeURIComponent(req.params.category);
  removeWinner(category);
  res.json({ success: true, winners: getWinners() });
});

// POST /api/auth — verify admin password
app.post("/api/auth", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
