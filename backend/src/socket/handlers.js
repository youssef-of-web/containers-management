import { docker, getContainerDetails } from '../services/docker.js';

const activeLogStreams = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected');

    // Send container updates every second
    const statsInterval = setInterval(async () => {
      try {
        const containers = await docker.listContainers({ all: true });
        const containerDetails = await Promise.all(
          containers.map(async container => {
            try {
              const details = await getContainerDetails(container.Id);
              return {
                id: container.Id,
                name: container.Names[0].replace('/', ''),
                state: details.state,
                stats: details.stats,
                Created: container.Created,
                Image: container.Image
              };
            } catch (error) {
              console.error(`Error getting container details: ${error}`);
              return null;
            }
          })
        );
        socket.emit('containers-update', containerDetails.filter(c => c !== null));
      } catch (error) {
        console.error('Error fetching containers:', error);
      }
    }, 1000);

    // Handle log streaming
    socket.on('subscribe-logs', async (containerId) => {
      try {
        if (activeLogStreams.has(containerId)) {
          activeLogStreams.get(containerId).destroy();
          activeLogStreams.delete(containerId);
        }

        const container = docker.getContainer(containerId);
        const logStream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          timestamps: true,
          tail: 100
        });

        activeLogStreams.set(containerId, logStream);

        logStream.on('data', (chunk) => {
          socket.emit('container-logs', {
            containerId,
            log: chunk.toString('utf8')
          });
        });

        logStream.on('error', (error) => {
          console.error('Log stream error:', error);
          socket.emit('container-logs-error', {
            containerId,
            error: error.message
          });
        });
      } catch (error) {
        console.error('Error setting up log stream:', error);
        socket.emit('container-logs-error', {
          containerId,
          error: error.message
        });
      }
    });

    socket.on('unsubscribe-logs', (containerId) => {
      if (activeLogStreams.has(containerId)) {
        activeLogStreams.get(containerId).destroy();
        activeLogStreams.delete(containerId);
      }
    });

    socket.on('disconnect', () => {
      clearInterval(statsInterval);
      // Clean up all active log streams for this socket
      activeLogStreams.forEach(stream => stream.destroy());
      activeLogStreams.clear();
      console.log('Client disconnected');
    });
  });
}
