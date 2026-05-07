import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getSetupStatus, me } from '../api';

export const Route = createRootRoute({
  component: () => {
    const navigate = useNavigate();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
      const path = window.location.pathname;
      // These routes don't need auth
      if (
        path.startsWith('/setup') ||
        path.startsWith('/login') ||
        path.startsWith('/invite')
      ) {
        setChecked(true);
        return;
      }
      getSetupStatus()
        .then(({ initialized }) => {
          if (!initialized) {
            navigate({ to: '/setup' });
            return;
          }
          return me().then(() => setChecked(true));
        })
        .catch(() => navigate({ to: '/login' }));
    }, []);

    if (!checked) return null;
    return <Outlet />;
  },
});
