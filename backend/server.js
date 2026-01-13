const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const postRoutes = require("./routes/posts");
const replyRoutes = require("./routes/replies");
const bookmarkRoutes = require("./routes/bookmarks");
const followRoutes = require("./routes/follows");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/replies", replyRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/follows", followRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Loop API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔄 Loop API server running on http://localhost:${PORT}`);
});
