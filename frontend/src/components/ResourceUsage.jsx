import { Progress, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

function ResourceUsage({ type, value, limit, showInfo = true }) {
  const percentage = type === 'cpu' ? value : (value / limit) * 100;
  const formattedValue = type === 'cpu' ? `${value?.toFixed(2)}%` : formatBytes(value);
  const formattedLimit = type === 'cpu' ? '100%' : formatBytes(limit);

  const getStrokeColor = (percent) => {
    if (percent >= 80) return '#ff4d4f';
    if (percent >= 60) return '#faad14';
    return '#52c41a';
  };

  const getStatusIcon = (percent) => {
    if (percent >= 80) return '🔥';
    if (percent >= 60) return '⚠️';
    return '✅';
  };

  return (
    <div className="resource-usage">
      <div className="resource-header">
        <span className="resource-label">
          {type === 'cpu' ? 'CPU' : 'Memory'} Usage {getStatusIcon(percentage)}
        </span>
        {showInfo && (
          <Tooltip title={`${formattedValue} / ${formattedLimit}`}>
            <InfoCircleOutlined className="info-icon" />
          </Tooltip>
        )}
      </div>
      <Progress
        percent={percentage?.toFixed(1)}
        strokeColor={getStrokeColor(percentage)}
        size="small"
        showInfo={false}
        className="resource-progress"
      />
      <div className="resource-details">
        <span>{formattedValue}</span>
        <span className="resource-limit">of {formattedLimit}</span>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default ResourceUsage;
