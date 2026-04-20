import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface AnnouncementProps {
  name?: string;
  appName?: string;
  title?: string;
  version?: string;
  body?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export const Announcement: React.FC<AnnouncementProps> = ({
  name = 'there',
  appName = 'our app',
  title = 'Exciting news',
  version = '',
  body = 'We have something new to share with you.',
  ctaUrl = '#',
  ctaLabel = 'Learn more',
}) => (
  <Html>
    <Head />
    <Preview>{title} — {appName}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          {version && (
            <Section className="mb-4">
              <Text
                className="inline-block text-xs font-semibold uppercase tracking-wide bg-orange-100 text-orange-700 rounded-full px-3 py-1 m-0"
              >
                {version}
              </Text>
            </Section>
          )}
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            {title}
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed">
            Hi {name},
          </Text>
          <Text className="text-slate-600 text-base leading-relaxed">
            {body}
          </Text>
          <Section className="my-8">
            <Button
              href={ctaUrl}
              className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 no-underline"
            >
              {ctaLabel} →
            </Button>
          </Section>
          <Hr className="border-slate-200 my-6" />
          <Text className="text-slate-400 text-sm">
            You're receiving this update because you're a {appName} user. To manage your
            email preferences, visit your account settings.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Announcement;
