import { createFileRoute, redirect } from '@tanstack/react-router';
import { getToken } from '../api';
import Login from '../pages/Login';

export const Route = createFileRoute('/login')({
  beforeLoad() {
    if (getToken()) throw redirect({ to: '/' });
  },
  component: Login,
});
