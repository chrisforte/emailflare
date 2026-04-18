import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import LogsPage from '../pages/Logs';

export const Route = createFileRoute('/logs')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><LogsPage /></Layout>,
});
