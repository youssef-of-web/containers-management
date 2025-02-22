import React, { useState, useRef, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  message,
  Spin,
  Card,
  Progress,
  Row,
  Col,
  Space,
  Tooltip,
  Switch,
} from "antd";
import axios from "axios";
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  BarsOutlined,
} from "@ant-design/icons";
import "./ContainerList.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Configure axios defaults
axios.defaults.baseURL = "";
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.withCredentials = true;

// API functions
const api = {
  getContainers: () => axios.get("/containers").then((res) => res.data),
  getLogs: (id) => axios.get(`/containers/${id}/logs`).then((res) => res.data),
  getStats: (id) =>
    axios.get(`/containers/${id}/stats`).then((res) => res.data),
  startContainer: (id) => axios.post(`/containers/${id}/start`),
  stopContainer: (id) => axios.post(`/containers/${id}/stop`),
  restartContainer: (id) => axios.post(`/containers/${id}/restart`),
  deleteContainer: (id) => axios.delete(`/containers/${id}`),
};

const ContainerList = () => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [isGridView, setIsGridView] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: containers = [], isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: api.getContainers,
    refetchInterval: 10000,
  });

  // Get stats for all running containers in a single query
  const { data: allContainerStats = {} } = useQuery({
    queryKey: ["container-stats"],
    queryFn: async () => {
      const statsPromises = containers
        .filter((container) => container.state === "running")
        .map((container) =>
          api
            .getStats(container.id)
            .then((stats) => ({ [container.id]: stats }))
            .catch(() => ({ [container.id]: null }))
        );
      const statsResults = await Promise.all(statsPromises);
      return statsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    },
    enabled: containers.length > 0,
    refetchInterval: 5000,
  });

  const containerStats = allContainerStats;

  const { data: logs = "", isLoading: logLoading } = useQuery({
    queryKey: ["container-logs", selectedContainer?.id],
    queryFn: () => api.getLogs(selectedContainer.id),
    enabled: !!selectedContainer,
    refetchInterval: selectedContainer ? 2000 : false, // Poll logs every 2 seconds when modal is open
    select: (data) =>
      typeof data === "object" ? JSON.stringify(data, null, 2) : String(data),
  });

  const renderContainerCard = (container) => (
    <Card
      key={container.id}
      className="container-card"
      size="small"
      title={
        <div className="card-title">
          <div className="card-title-content">
            <CloudServerOutlined className="card-icon" />
            <Tooltip title={container.name}>
              <span className="container-name">{container.name}</span>
            </Tooltip>
          </div>
          <span className={`status-${container.state.toLowerCase()}`}>
            {container.state}
          </span>
        </div>
      }
      actions={[
        container.state === "running" ? (
          <Tooltip title="Stop Container" key="stop">
            <Button
              type="text"
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleContainerAction(container.id, "stop")}
              loading={loadingStates[`stop-${container.id}`]}
            />
          </Tooltip>
        ) : (
          <Tooltip title="Start Container" key="start">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined style={{ color: "#52c41a" }} />}
              onClick={() => handleContainerAction(container.id, "start")}
              loading={loadingStates[`start-${container.id}`]}
            />
          </Tooltip>
        ),
        container.state === "running" && (
          <Tooltip title="Restart Container" key="restart">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined style={{ color: "#1890ff" }} />}
              onClick={() => handleContainerAction(container.id, "restart")}
              loading={loadingStates[`restart-${container.id}`]}
            />
          </Tooltip>
        ),
        <Tooltip title="View Logs" key="logs">
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined style={{ color: "#8c8c8c" }} />}
            onClick={() => showLogs(container)}
          />
        </Tooltip>,
        <Tooltip title="Delete Container" key="delete">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setContainerToDelete(container)}
            loading={loadingStates[`delete-${container.id}`]}
          />
        </Tooltip>,
      ].filter(Boolean)}
    >
      <div className="container-info">
        <div className="info-row">
          <strong>Image:</strong>
          <span style={{ fontSize: "12px", wordBreak: "break-all" }}>
            {container.image}
          </span>
        </div>
        {container.state === "running" && (
          <div className="resource-usage">
            <div className="resource-item">
              <Tooltip
                title={`CPU Usage: ${
                  containerStats[container.id]?.cpu || "0"
                }%`}
              >
                <Progress
                  type="circle"
                  percent={parseFloat(containerStats[container.id]?.cpu || "0")}
                  width={50}
                  strokeWidth={10}
                  status={
                    parseFloat(containerStats[container.id]?.cpu || "0") > 80
                      ? "exception"
                      : "normal"
                  }
                  format={(percent) => (
                    <span style={{ fontSize: "11px" }}>{percent}%</span>
                  )}
                />
              </Tooltip>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>CPU</div>
            </div>
            <div className="resource-item">
              <Tooltip
                title={`Memory Usage: ${
                  containerStats[container.id]?.memory?.usage || "0 MB"
                } / ${containerStats[container.id]?.memory?.limit || "0 MB"} (${
                  containerStats[container.id]?.memory?.percent || "0"
                }%)`}
              >
                <Progress
                  type="circle"
                  percent={parseFloat(
                    containerStats[container.id]?.memory?.percent || "0"
                  )}
                  width={50}
                  strokeWidth={10}
                  status={
                    parseFloat(
                      containerStats[container.id]?.memory?.percent || "0"
                    ) > 80
                      ? "exception"
                      : "normal"
                  }
                  format={(percent) => (
                    <span style={{ fontSize: "11px" }}>{percent}%</span>
                  )}
                />
              </Tooltip>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>Memory</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const getColumns = () => [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div className="container-name">
          <CloudServerOutlined className="container-icon" />
          {text}
        </div>
      ),
    },
    {
      title: "Image",
      dataIndex: "image",
      key: "image",
    },
    {
      title: "Status",
      dataIndex: "state",
      key: "state",
      render: (state) => (
        <span className={`status-${state.toLowerCase()}`}>{state}</span>
      ),
    },
    {
      title: "CPU Usage",
      key: "cpu",
      render: (_, record) => {
        const stats = containerStats[record.id] || {
          cpu: "0",
          memory: { percent: "0", usage: "0 MB", limit: "0 MB" },
        };
        return (
          <Progress
            percent={parseFloat(stats.cpu)}
            size="small"
            status={parseFloat(stats.cpu) > 80 ? "exception" : "normal"}
          />
        );
      },
    },
    {
      title: "Memory Usage",
      key: "memory",
      render: (_, record) => {
        const stats = containerStats[record.id] || {
          cpu: "0",
          memory: { percent: "0", usage: "0 MB", limit: "0 MB" },
        };
        return (
          <div>
            <Progress
              percent={parseFloat(stats.memory.percent)}
              size="small"
              status={
                parseFloat(stats.memory.percent) > 80 ? "exception" : "normal"
              }
            />
            <div className="memory-details">
              {stats.memory.usage} / {stats.memory.limit}
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="action-buttons">
          {record.state === "running" ? (
            <>
              <Tooltip title="Stop Container">
                <Button
                  type="primary"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => handleContainerAction(record.id, "stop")}
                  loading={loadingStates[`stop-${record.id}`]}
                />
              </Tooltip>
              <Tooltip title="Restart Container">
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => handleContainerAction(record.id, "restart")}
                  loading={loadingStates[`restart-${record.id}`]}
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Start Container">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleContainerAction(record.id, "start")}
                loading={loadingStates[`start-${record.id}`]}
              />
            </Tooltip>
          )}
          <Tooltip title="View Logs">
            <Button
              icon={<FileTextOutlined />}
              onClick={() => showLogs(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Container">
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setContainerToDelete(record)}
              loading={loadingStates[`delete-${record.id}`]}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  // Mutations
  const startMutation = useMutation({
    mutationFn: api.startContainer,
    onMutate: (containerId) => {
      setLoadingStates((prev) => ({ ...prev, [`start-${containerId}`]: true }));
    },
    onSettled: (_, __, containerId) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`start-${containerId}`]: false,
      }));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["container-logs"] });
    },
    onSuccess: () => {
      message.success("Container started successfully");
    },
    onError: (error) => {
      message.error(error.response?.data?.error || "Failed to start container");
    },
  });

  const stopMutation = useMutation({
    mutationFn: api.stopContainer,
    onMutate: (containerId) => {
      setLoadingStates((prev) => ({ ...prev, [`stop-${containerId}`]: true }));
    },
    onSettled: (_, __, containerId) => {
      setLoadingStates((prev) => ({ ...prev, [`stop-${containerId}`]: false }));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["container-logs"] });
    },
    onSuccess: () => {
      message.success("Container stopped successfully");
    },
    onError: (error) => {
      message.error(error.response?.data?.error || "Failed to stop container");
    },
  });

  const restartMutation = useMutation({
    mutationFn: api.restartContainer,
    onMutate: (containerId) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`restart-${containerId}`]: true,
      }));
    },
    onSettled: (_, __, containerId) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`restart-${containerId}`]: false,
      }));
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["container-logs"] });
    },
    onSuccess: () => {
      message.success("Container restarted successfully");
    },
    onError: (error) => {
      message.error(
        error.response?.data?.error || "Failed to restart container"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteContainer,
    onMutate: (containerId) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`delete-${containerId}`]: true,
      }));
    },
    onSettled: (_, __, containerId) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`delete-${containerId}`]: false,
      }));
      setDeleteModalVisible(false);
      setContainerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      queryClient.invalidateQueries({ queryKey: ["container-logs"] });
    },
    onSuccess: () => {
      message.success("Container deleted successfully");
    },
    onError: (error) => {
      message.error(
        error.response?.data?.error || "Failed to delete container"
      );
    },
  });

  const handleLogScroll = useCallback(() => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isScrolledToBottom =
      Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

    if (isScrolledToBottom !== autoScroll) {
      setAutoScroll(isScrolledToBottom);
    }
  }, [autoScroll]);

  const showLogs = (container) => {
    setSelectedContainer(container);
    setLogModalVisible(true);
  };

  const handleLogModalClose = () => {
    setLogModalVisible(false);
    setSelectedContainer(null);
    setAutoScroll(true);
    queryClient.removeQueries(["container-logs"]);
  };

  const downloadLogs = () => {
    if (!logs || !selectedContainer) return;

    const blob = new Blob([logs], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedContainer.name}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleContainerAction = async (containerId, action) => {
    switch (action) {
      case "start":
        startMutation.mutate(containerId);
        break;
      case "stop":
        stopMutation.mutate(containerId);
        break;
      case "restart":
        restartMutation.mutate(containerId);
        break;
    }
  };

  const handleDelete = () => {
    if (!containerToDelete) return;
    deleteMutation.mutate(containerToDelete.id);
  };

  const runningContainers = containers.filter(
    (container) => container.state === "running"
  );
  const stoppedContainers = containers.filter(
    (container) => container.state !== "running"
  );

  const renderContainers = (containers, title) => (
    <div className="section">
      <div className="section-header">
        <h2>
          <CloudServerOutlined /> {title}
          <span className="container-count">{containers.length}</span>
        </h2>
        <Space>
          <Tooltip
            title={isGridView ? "Switch to Table View" : "Switch to Grid View"}
          >
            <Button
              type="text"
              icon={isGridView ? <BarsOutlined /> : <AppstoreOutlined />}
              onClick={() => setIsGridView(!isGridView)}
            />
          </Tooltip>
        </Space>
      </div>
      {isLoading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : containers.length > 0 ? (
        isGridView ? (
          <div className="container-grid">
            {containers.map(renderContainerCard)}
          </div>
        ) : (
          <Table
            columns={getColumns()}
            dataSource={containers}
            rowKey="id"
            pagination={false}
          />
        )
      ) : (
        <div className="empty-state">No {title.toLowerCase()}</div>
      )}
    </div>
  );

  return (
    <div className="container-list">
      <Modal
        title="Delete Container"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setContainerToDelete(null);
        }}
        okButtonProps={{
          danger: true,
          loading: deleteMutation.isPending,
        }}
        okText="Delete"
        width={500}
        afterClose={() => setDeleteModalVisible(false)}
      >
        {containerToDelete && (
          <div className="delete-confirm-content">
            <p>Are you sure you want to delete this container?</p>
            <div className="container-info">
              <div>
                <strong>Name:</strong> {containerToDelete.name}
              </div>
              <div>
                <strong>Image:</strong> {containerToDelete.image}
              </div>
              <div>
                <strong>Status:</strong> {containerToDelete.state}
              </div>
            </div>
            <div className="delete-warning">
              Warning: This action cannot be undone. The container and its data
              will be permanently deleted.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="log-actions">
            <div className="log-status">
              <span>Container Logs: {selectedContainer?.name}</span>
              {logLoading && <Spin size="small" />}
            </div>
            <Space>
              <Switch
                className="auto-scroll-toggle"
                checked={autoScroll}
                onChange={setAutoScroll}
                checkedChildren="Auto-scroll ON"
                unCheckedChildren="Auto-scroll OFF"
                size="small"
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadLogs}
                disabled={!logs}
              >
                Download
              </Button>
            </Space>
          </div>
        }
        open={logModalVisible}
        onCancel={handleLogModalClose}
        width={800}
        style={{ body: { padding: "12px" } }}
      >
        <div
          className="log-container"
          ref={logContainerRef}
          onScroll={handleLogScroll}
        >
          {logs ? (
            <pre>{logs}</pre>
          ) : (
            <div className="log-empty">No logs available</div>
          )}
        </div>
      </Modal>

      {renderContainers(runningContainers, "Running Containers")}
      {renderContainers(stoppedContainers, "Stopped Containers")}
    </div>
  );
};

export default ContainerList;
