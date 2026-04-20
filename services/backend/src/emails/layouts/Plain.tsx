import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface PlainProps {
  name?: string;
  subject?: string;
  body?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  appName?: string;
  footerNote?: string;
}

export const Plain: React.FC<PlainProps> = ({
  name = 'there',
  subject = 'A message for you',
  body = 'This is a plain email message.',
  ctaUrl = '',
  ctaLabel = 'Learn more',
  appName = 'our app',
  footerNote = '',
}) => (
  <Html>
    <Head />
    <Preview>{subject}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            {subject}
          </Heading>
          {name && name !== 'there' && (
            <Text className="text-slate-600 text-base leading-relaxed">
              Hi {name},
            </Text>
          )}
          <Text className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
            {body}
          </Text>
          {ctaUrl && (
            <Section className="my-8">
              <Button
                href={ctaUrl}
                className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 no-underline"
              >
                {ctaLabel} →
              </Button>
            </Section>
          )}
          <Hr className="border-slate-200 my-6" />
          <Text className="text-slate-400 text-sm">
            {footerNote || `This email was sent by ${appName}.`}
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Plain;
