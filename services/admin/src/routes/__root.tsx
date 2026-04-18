import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { clearToken, getToken } from '../api';

export const Route = createRootRoute({
  component: () => {
    // If no token and not on /login, redirect
    const token = getToken();
    const navigate = useNavigate();
    if (!token && !window.location.pathname.startsWith('/login')) {
      navigate({ to: '/login' });
      return null;
    }
    return <Outlet />;
  },
});
