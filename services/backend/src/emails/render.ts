import { render } from '@react-email/render';
import { Welcome } from './layouts/Welcome.js';
import { MagicLink } from './layouts/MagicLink.js';
import { Notification } from './layouts/Notification.js';
import { OTP } from './layouts/OTP.js';
import { EmailVerify } from './layouts/EmailVerify.js';
import { PasswordReset } from './layouts/PasswordReset.js';
import { PasswordChanged } from './layouts/PasswordChanged.js';
import { NewLogin } from './layouts/NewLogin.js';
import { OrderConfirm } from './layouts/OrderConfirm.js';
import { Invoice } from './layouts/Invoice.js';
import { SubscriptionStarted } from './layouts/SubscriptionStarted.js';
import { SubscriptionCancelled } from './layouts/SubscriptionCancelled.js';
import { TrialEnding } from './layouts/TrialEnding.js';
import { TeamInvite } from './layouts/TeamInvite.js';
import { Alert } from './layouts/Alert.js';
import { Digest } from './layouts/Digest.js';
import { Announcement } from './layouts/Announcement.js';
import { Feedback } from './layouts/Feedback.js';
import { AccountDeleted } from './layouts/AccountDeleted.js';
import { Plain } from './layouts/Plain.js';
import React from 'react';

export type LayoutName =
  | 'welcome' | 'magic-link' | 'notification' | 'otp'
  | 'email-verify' | 'password-reset' | 'password-changed' | 'new-login'
  | 'order-confirm' | 'invoice' | 'subscription-started' | 'subscription-cancelled'
  | 'trial-ending' | 'team-invite' | 'alert' | 'digest'
  | 'announcement' | 'feedback' | 'account-deleted' | 'plain';

export const LAYOUTS: Record<LayoutName, { label: string; variables: string[] }> = {
  'welcome':                { label: 'Welcome',                 variables: ['name', 'appName', 'loginUrl'] },
  'magic-link':             { label: 'Magic Link',              variables: ['name', 'magicUrl', 'expiresIn'] },
  'notification':           { label: 'Notification',            variables: ['name', 'title', 'message', 'actionUrl', 'actionLabel'] },
  'otp':                    { label: 'OTP Code',                variables: ['name', 'code', 'expiresIn'] },
  'email-verify':           { label: 'Email Verification',      variables: ['name', 'appName', 'verifyUrl', 'expiresIn'] },
  'password-reset':         { label: 'Password Reset',          variables: ['name', 'appName', 'resetUrl', 'expiresIn'] },
  'password-changed':       { label: 'Password Changed',        variables: ['name', 'appName', 'changedAt', 'supportUrl'] },
  'new-login':              { label: 'New Login Alert',         variables: ['name', 'appName', 'device', 'location', 'time', 'secureUrl'] },
  'order-confirm':          { label: 'Order Confirmation',      variables: ['name', 'orderId', 'orderDate', 'total', 'itemsSummary', 'trackingUrl'] },
  'invoice':                { label: 'Invoice',                 variables: ['name', 'appName', 'invoiceId', 'invoiceDate', 'dueDate', 'total', 'description', 'payUrl'] },
  'subscription-started':   { label: 'Subscription Started',    variables: ['name', 'appName', 'planName', 'amount', 'billingInterval', 'nextBillingDate', 'dashboardUrl'] },
  'subscription-cancelled': { label: 'Subscription Cancelled',  variables: ['name', 'appName', 'planName', 'endDate', 'resubscribeUrl'] },
  'trial-ending':           { label: 'Trial Ending',            variables: ['name', 'appName', 'trialEndDate', 'daysLeft', 'upgradeUrl'] },
  'team-invite':            { label: 'Team Invitation',         variables: ['name', 'inviterName', 'teamName', 'appName', 'role', 'inviteUrl', 'expiresIn'] },
  'alert':                  { label: 'Alert',                   variables: ['name', 'appName', 'title', 'message', 'severity', 'actionUrl', 'actionLabel'] },
  'digest':                 { label: 'Digest',                  variables: ['name', 'appName', 'period', 'highlight1', 'highlight2', 'highlight3', 'dashboardUrl'] },
  'announcement':           { label: 'Announcement',            variables: ['name', 'appName', 'title', 'version', 'body', 'ctaUrl', 'ctaLabel'] },
  'feedback':               { label: 'Feedback Request',        variables: ['name', 'appName', 'surveyUrl', 'context', 'incentive'] },
  'account-deleted':        { label: 'Account Deleted',         variables: ['name', 'appName', 'deletedAt', 'supportUrl'] },
  'plain':                  { label: 'Plain Message',           variables: ['name', 'subject', 'body', 'ctaUrl', 'ctaLabel', 'appName', 'footerNote'] },
};

export async function renderLayout(layout: LayoutName, variables: Record<string, string>): Promise<string> {
  const components: Record<LayoutName, React.FC<Record<string, string>>> = {
    'welcome':                Welcome as React.FC<Record<string, string>>,
    'magic-link':             MagicLink as React.FC<Record<string, string>>,
    'notification':           Notification as React.FC<Record<string, string>>,
    'otp':                    OTP as React.FC<Record<string, string>>,
    'email-verify':           EmailVerify as React.FC<Record<string, string>>,
    'password-reset':         PasswordReset as React.FC<Record<string, string>>,
    'password-changed':       PasswordChanged as React.FC<Record<string, string>>,
    'new-login':              NewLogin as React.FC<Record<string, string>>,
    'order-confirm':          OrderConfirm as React.FC<Record<string, string>>,
    'invoice':                Invoice as React.FC<Record<string, string>>,
    'subscription-started':   SubscriptionStarted as React.FC<Record<string, string>>,
    'subscription-cancelled': SubscriptionCancelled as React.FC<Record<string, string>>,
    'trial-ending':           TrialEnding as React.FC<Record<string, string>>,
    'team-invite':            TeamInvite as React.FC<Record<string, string>>,
    'alert':                  Alert as React.FC<Record<string, string>>,
    'digest':                 Digest as React.FC<Record<string, string>>,
    'announcement':           Announcement as React.FC<Record<string, string>>,
    'feedback':               Feedback as React.FC<Record<string, string>>,
    'account-deleted':        AccountDeleted as React.FC<Record<string, string>>,
    'plain':                  Plain as React.FC<Record<string, string>>,
  };

  const Component = components[layout];
  if (!Component) throw new Error(`Unknown layout: ${layout}`);

  return render(React.createElement(Component, variables));
}
