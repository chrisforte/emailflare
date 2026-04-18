import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import KeysPage from '../pages/Keys';

export const Route = createFileRoute('/keys')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><KeysPage /></Layout>,
});
