const express = require("express");
const router = express.Router();
const {
  getContainers,
  getLogs,
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  getContainerStats,
} = require("../controllers/containers");

// Get all containers
router.get("/", getContainers);

// Get container logs
router.get("/:id/logs", getLogs);

// Get container stats
router.get("/:id/stats", getContainerStats);

// Container actions
router.post("/:id/start", startContainer);
router.post("/:id/stop", stopContainer);
router.post("/:id/restart", restartContainer);
router.delete("/:id", deleteContainer);

module.exports = router;
