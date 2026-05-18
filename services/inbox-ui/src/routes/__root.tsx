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
          // Initialized — check session; redirect to login if not authenticated
          return me()
            .then(() => setChecked(true))
            .catch(() => navigate({ to: '/login' }));
        })
        .catch(() => {
          // Setup status check failed entirely — assume not initialized
          navigate({ to: '/setup' });
        });
    }, []);

    if (!checked) return null;
    return <Outlet />;
  },
});
