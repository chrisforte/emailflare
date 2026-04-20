import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface FeedbackProps {
  name?: string;
  appName?: string;
  surveyUrl?: string;
  context?: string;
  incentive?: string;
}

export const Feedback: React.FC<FeedbackProps> = ({
  name = 'there',
  appName = 'our app',
  surveyUrl = '#',
  context = 'your recent experience',
  incentive = '',
}) => (
  <Html>
    <Head />
    <Preview>How was your experience? Share your feedback for {appName}</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Heading className="text-2xl font-bold text-slate-900 mt-0">
            How was your experience?
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed">
            Hi {name}, we'd love to hear about {context}. Your feedback helps us
            improve {appName} for everyone.
          </Text>
          {incentive && (
            <Section className="bg-orange-50 border border-orange-200 rounded-lg px-5 py-4 my-4">
              <Text className="text-orange-800 text-sm font-medium m-0">
                🎁 {incentive}
              </Text>
            </Section>
          )}
          <Text className="text-slate-600 text-base leading-relaxed">
            It only takes 2 minutes. We read every response personally.
          </Text>
          <Section className="my-8">
            <Button
              href={surveyUrl}
              className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 no-underline"
            >
              Share feedback →
            </Button>
          </Section>
          <Hr className="border-slate-200 my-6" />
          <Text className="text-slate-400 text-sm">
            This is a one-time email from {appName}. If you don't want to hear from us
            about feedback, just ignore this message.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Feedback;
