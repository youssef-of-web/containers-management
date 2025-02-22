import { useEffect, useRef, useState } from 'react';
import { Typography, Switch, Button, Space, Tooltip, Spin } from 'antd';
import { 
  DownloadOutlined, 
  ClearOutlined, 
  PauseCircleOutlined, 
  PlayCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useSocket } from '../context/SocketContext';

const { Text } = Typography;
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

function ContainerLogs({ containerId }) {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe-logs', containerId);

    socket.on('container-logs', ({ containerId: id, log }) => {
      if (id === containerId && !isPaused) {
        setLogs(prev => [...prev, formatLogEntry(log)]);
        setIsLoading(false);
      }
    });

    return () => {
      socket.emit('unsubscribe-logs', containerId);
      socket.off('container-logs');
    };
  }, [socket, containerId, isPaused]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [logs, autoScroll]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `container-${containerId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatLogEntry = (log) => {
    // Extract timestamp if present
    const timestampMatch = log.match(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z/);
    if (timestampMatch) {
      const timestamp = new Date(timestampMatch[0]).toLocaleTimeString();
      const message = log.substring(timestampMatch[0].length + 1);
      return { timestamp, message, type: message.includes('error') ? 'error' : 'info' };
    }
    return { timestamp: new Date().toLocaleTimeString(), message: log, type: log.includes('error') ? 'error' : 'info' };
  };

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <Space>
          <Button
            icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearLogs}>
            Clear
          </Button>
          <Button icon={<DownloadOutlined />} onClick={downloadLogs}>
            Download
          </Button>
          <Tooltip title="Auto-scroll to bottom">
            <Switch
              checked={autoScroll}
              onChange={setAutoScroll}
              checkedChildren="Auto-scroll"
              unCheckedChildren="Manual"
            />
          </Tooltip>
        </Space>
      </div>

      {isLoading ? (
        <div className="logs-loading">
          <Spin indicator={antIcon} />
          <Text>Loading logs...</Text>
        </div>
      ) : (
        <div 
          className="logs-container" 
          ref={logsContainerRef}
          onScroll={handleScroll}
        >
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`log-line ${log.type}`}
            >
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}

export default ContainerLogs;
