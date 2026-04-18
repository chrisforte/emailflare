import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface NotificationProps {
  name?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const Notification: React.FC<NotificationProps> = ({
  name = 'there',
  title = 'You have a notification',
  message = 'Something happened that requires your attention.',
  actionUrl = '#',
  actionLabel = 'View details',
}) => (
  <Html>
    <Head />
    <Preview>{title}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            {title}
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed">
            Hi {name},
          </Text>
          <Text className="text-slate-600 text-base leading-relaxed">
            {message}
          </Text>
          <Hr className="border-slate-200 my-6" />
          {actionUrl && actionUrl !== '#' && (
            <Section className="my-4">
              <Button
                href={actionUrl}
                className="bg-violet-600 text-white font-semibold rounded-lg px-6 py-3 no-underline"
              >
                {actionLabel} →
              </Button>
            </Section>
          )}
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Notification;
