import { render } from '@react-email/render';
import { Welcome } from './layouts/Welcome.js';
import { MagicLink } from './layouts/MagicLink.js';
import { Notification } from './layouts/Notification.js';
import { OTP } from './layouts/OTP.js';
import React from 'react';

export type LayoutName = 'welcome' | 'magic-link' | 'notification' | 'otp';

export const LAYOUTS: Record<LayoutName, { label: string; variables: string[] }> = {
  'welcome':      { label: 'Welcome',      variables: ['name', 'appName', 'loginUrl'] },
  'magic-link':   { label: 'Magic Link',   variables: ['name', 'magicUrl', 'expiresIn'] },
  'notification': { label: 'Notification', variables: ['name', 'title', 'message', 'actionUrl', 'actionLabel'] },
  'otp':          { label: 'OTP Code',     variables: ['name', 'code', 'expiresIn'] },
};

export async function renderLayout(layout: LayoutName, variables: Record<string, string>): Promise<string> {
  const components: Record<LayoutName, React.FC<Record<string, string>>> = {
    'welcome':      Welcome as React.FC<Record<string, string>>,
    'magic-link':   MagicLink as React.FC<Record<string, string>>,
    'notification': Notification as React.FC<Record<string, string>>,
    'otp':          OTP as React.FC<Record<string, string>>,
  };

  const Component = components[layout];
  if (!Component) throw new Error(`Unknown layout: ${layout}`);

  return render(React.createElement(Component, variables));
}
