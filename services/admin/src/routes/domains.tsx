import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import DomainsPage from '../pages/Domains';

export const Route = createFileRoute('/domains')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><DomainsPage /></Layout>,
});
