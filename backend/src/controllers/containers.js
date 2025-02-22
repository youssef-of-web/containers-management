const Docker = require("dockerode");
const docker = new Docker();

// Get container stats
const getContainerStats = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    const statsStream = await container.stats({ stream: false });

    const cpuDelta =
      statsStream.cpu_stats.cpu_usage.total_usage -
      statsStream.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      statsStream.cpu_stats.system_cpu_usage -
      statsStream.precpu_stats.system_cpu_usage;
    const cpuCores = statsStream.cpu_stats.cpu_usage.percpu_usage?.length || 1;

    const cpuPercent = (cpuDelta / systemDelta) * cpuCores * 100;
    const memoryPercent =
      (statsStream.memory_stats.usage / statsStream.memory_stats.limit) * 100;

    const stats = {
      cpu: cpuPercent.toFixed(2),
      memory: {
        percent: memoryPercent.toFixed(2),
        usage: formatBytes(statsStream.memory_stats.usage),
        limit: formatBytes(statsStream.memory_stats.limit),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error(`Error getting stats for container ${id}:`, error);
    res.status(500).json({ error: "Failed to get container stats" });
  }
};

// Get all containers
const getContainers = async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const containersWithStats = await Promise.all(
      containers.map(async (container) => {
        return {
          id: container.Id,
          name: container.Names[0].replace("/", ""),
          image: container.Image,
          state: container.State,
          status: container.Status,
        };
      })
    );

    res.json(containersWithStats);
  } catch (error) {
    console.error("Error getting containers:", error);
    res.status(500).json({ error: "Failed to get containers" });
  }
};

// Get container logs
const getLogs = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 1000,
      timestamps: true,
    });

    // Convert Buffer to string and format timestamps
    const formattedLogs = logs
      .toString("utf8")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const timestamp = line.slice(0, 30);
        const message = line.slice(31);
        return `${timestamp} ${message}`;
      })
      .join("\n");

    res.send(formattedLogs);
  } catch (error) {
    console.error("Error getting container logs:", error);
    res.status(500).json({ error: "Failed to get container logs" });
  }
};

// Start container
const startContainer = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    await container.start();
    res.json({ message: "Container started successfully" });
  } catch (error) {
    console.error("Error starting container:", error);
    res.status(500).json({ error: "Failed to start container" });
  }
};

// Stop container
const stopContainer = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    await container.stop();
    res.json({ message: "Container stopped successfully" });
  } catch (error) {
    console.error("Error stopping container:", error);
    res.status(500).json({ error: "Failed to stop container" });
  }
};

// Restart container
const restartContainer = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    await container.restart();
    res.json({ message: "Container restarted successfully" });
  } catch (error) {
    console.error("Error restarting container:", error);
    res.status(500).json({ error: "Failed to restart container" });
  }
};

// Delete container
const deleteContainer = async (req, res) => {
  const { id } = req.params;

  try {
    const container = docker.getContainer(id);
    await container.remove({ force: true });
    res.json({ message: "Container deleted successfully" });
  } catch (error) {
    console.error("Error deleting container:", error);
    res.status(500).json({ error: "Failed to delete container" });
  }
};

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = {
  getContainers,
  getLogs,
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  getContainerStats,
};
