import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import TemplatesPage from '../pages/Templates';

export const Route = createFileRoute('/templates')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><TemplatesPage /></Layout>,
});
