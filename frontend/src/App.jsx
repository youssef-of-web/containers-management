import React from 'react';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import ContainerList from './components/ContainerList';
import { ConfigProvider } from 'antd';

const { Content } = Layout;

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout className="layout">
        <AppHeader />
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          <ContainerList />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
