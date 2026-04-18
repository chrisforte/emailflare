import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';

export const Route = createFileRoute('/')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><Dashboard /></Layout>,
});
