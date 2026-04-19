import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Layout from '../components/Layout';
import PlaygroundPage from '../pages/Playground';

export const Route = createFileRoute('/playground')({
  beforeLoad() {
    if (!getToken()) throw redirect({ to: '/login' });
  },
  component: () => <Layout><PlaygroundPage /></Layout>,
});
