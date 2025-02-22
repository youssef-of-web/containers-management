import Docker from 'dockerode';

export const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function getContainerDetails(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    let stats = null;

    if (info.State.Running) {
      try {
        stats = await container.stats({ stream: false });
      } catch (error) {
        console.error(`Error getting container stats: ${error.message}`);
      }
    }

    return {
      ...info,
      stats: stats ? {
        cpu_percentage: calculateCPUPercentage(stats),
        memory_usage: stats.memory_stats.usage || 0,
        memory_limit: stats.memory_stats.limit || 0
      } : null,
      state: info.State.Running ? 'running' : 'exited'
    };
  } catch (error) {
    console.error(`Error getting container details: ${error.message}`);
    throw new Error(`Failed to get container details: ${error.message}`);
  }
}

function calculateCPUPercentage(stats) {
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }
    return 0;
  } catch (error) {
    console.error(`Error calculating CPU percentage: ${error.message}`);
    return 0;
  }
}
