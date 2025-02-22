import { Layout, Typography, Space, Badge } from 'antd';
import { ContainerOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

function AppHeader() {
  return (
    <Header style={{background: "white"}}>
      <div className="container mx-auto flex justify-between items-center">
        <Space>
          <ContainerOutlined className="text-2xl" />
          <Title level={4} style={{ margin: 0 }}>Docker Management</Title>
        </Space>
      </div>
    </Header>
  );
}

export default AppHeader;
