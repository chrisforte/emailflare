import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components';

interface WelcomeProps {
  name?: string;
  appName?: string;
  loginUrl?: string;
}

export const Welcome: React.FC<WelcomeProps> = ({
  name = 'there',
  appName = 'EmailFlair',
  loginUrl = '#',
}) => (
  <Html>
    <Head />
    <Preview>Welcome to {appName}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            Welcome to {appName} 👋
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed">
            Hi {name}, we're excited to have you on board.
            You can now start sending beautiful emails.
          </Text>
          <Section className="my-8">
            <Button
              href={loginUrl}
              className="bg-violet-600 text-white font-semibold rounded-lg px-6 py-3 no-underline"
            >
              Get started →
            </Button>
          </Section>
          <Text className="text-slate-400 text-sm">
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Welcome;
