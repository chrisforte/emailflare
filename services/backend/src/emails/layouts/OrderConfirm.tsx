import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind, Hr,
} from '@react-email/components';

interface OrderConfirmProps {
  name?: string;
  orderId?: string;
  orderDate?: string;
  total?: string;
  itemsSummary?: string;
  trackingUrl?: string;
}

export const OrderConfirm: React.FC<OrderConfirmProps> = ({
  name = 'there',
  orderId = '00000',
  orderDate = 'today',
  total = '$0.00',
  itemsSummary = '1 item',
  trackingUrl = '#',
}) => (
  <Html>
    <Head />
    <Preview>Order #{orderId} confirmed — thanks for your purchase!</Preview>
    <Tailwind>
      <Body className="bg-slate-50 font-sans py-8">
        <Container className="bg-white rounded-xl shadow-sm max-w-[600px] mx-auto px-8 py-10">
          <Section className="text-center mb-6">
            <Text className="text-4xl m-0">✅</Text>
          </Section>
          <Heading className="text-2xl font-bold text-slate-900 mt-0 text-center">
            Order confirmed!
          </Heading>
          <Text className="text-slate-600 text-base leading-relaxed text-center">
            Hi {name}, thank you for your purchase. Your order is being processed.
          </Text>
          <Hr className="border-slate-200 my-6" />
          <Section className="bg-slate-50 rounded-lg px-5 py-4 my-4">
            <Text className="text-slate-500 text-xs uppercase tracking-wide font-semibold m-0 mb-3">
              Order summary
            </Text>
            <Text className="text-slate-700 text-sm m-0 mb-1">
              <strong>Order #:</strong> {orderId}
            </Text>
            <Text className="text-slate-700 text-sm m-0 mb-1">
              <strong>Date:</strong> {orderDate}
            </Text>
            <Text className="text-slate-700 text-sm m-0 mb-1">
              <strong>Items:</strong> {itemsSummary}
            </Text>
            <Hr className="border-slate-200 my-3" />
            <Text className="text-slate-900 text-base font-semibold m-0">
              Total: {total}
            </Text>
          </Section>
          <Section className="my-8 text-center">
            <Button
              href={trackingUrl}
              className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 no-underline"
            >
              Track your order →
            </Button>
          </Section>
          <Hr className="border-slate-200 my-6" />
          <Text className="text-slate-400 text-sm text-center">
            Questions about your order? Reply to this email or visit our support center.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default OrderConfirm;
