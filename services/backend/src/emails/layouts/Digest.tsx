import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface DigestProps {
  name?: string;
  appName?: string;
  period?: string;
  highlight1?: string;
  highlight2?: string;
  highlight3?: string;
  dashboardUrl?: string;
}

export const Digest: React.FC<DigestProps> = ({
  name = 'there',
  appName = 'our app',
  period = 'weekly',
  highlight1 = 'No data available',
  highlight2 = '',
  highlight3 = '',
  dashboardUrl = '#',
}) => (
  <Html>
    <Head />
    <Preview>Your {period} digest from {appName}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Text className="text-slate-500 text-xs uppercase tracking-widest font-semibold m-0 mb-3">
            {period} digest
          </Text>
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            Here's your summary, {name}
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed">
            Your {period} highlights from {appName}:
          </Text>
          <Hr className="border-slate-200 my-6" />
          <Section className="my-2">
            <Text className="text-slate-800 text-base m-0 mb-3 leading-relaxed">
              → {highlight1}
            </Text>
            {highlight2 && (
              <Text className="text-slate-800 text-base m-0 mb-3 leading-relaxed">
                → {highlight2}
              </Text>
            )}
            {highlight3 && (
              <Text className="text-slate-800 text-base m-0 leading-relaxed">
                → {highlight3}
              </Text>
            )}
          </Section>
          <Hr className="border-slate-200 my-6" />
          <Section className="my-6">
            <Button
              href={dashboardUrl}
              className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 no-underline"
            >
              View full report →
            </Button>
          </Section>
          <Text className="text-slate-400 text-sm">
            You're receiving this digest because you have {period} summaries enabled in
            your {appName} preferences. To unsubscribe, update your notification settings.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Digest;
