import { Body, Button, Container, Head, Heading, Html, Preview, render, Text } from "react-email";
import type { ReactNode } from "react";
import type { Mail } from "../../shared/mail/mailer.ts";

// Add a template: write a component below, add it to `templates`, call `renderMail`.
// Preview while editing: https://react.email (the components render in any browser).

const Layout = ({ preview, children }: { preview: string; children: ReactNode }) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f6f4", padding: "24px" }}>
      <Container style={{ background: "#ffffff", borderRadius: 8, padding: 32, maxWidth: 480 }}>{children}</Container>
    </Body>
  </Html>
);

const ResetPassword = ({ name, url }: { name: string; url: string }) => (
  <Layout preview="Reset your password">
    <Heading as="h1" style={{ fontSize: 22 }}>Reset your password</Heading>
    <Text>Hi {name}, use the button below to choose a new password. The link expires in one hour.</Text>
    <Button href={url} style={{ background: "#111111", color: "#ffffff", padding: "12px 20px", borderRadius: 6 }}>
      Choose a new password
    </Button>
    <Text style={{ color: "#666666", fontSize: 13 }}>If you did not ask for this, ignore this message.</Text>
  </Layout>
);

const Welcome = ({ name }: { name: string }) => (
  <Layout preview={`Welcome, ${name}`}>
    <Heading as="h1" style={{ fontSize: 22 }}>Welcome, {name}</Heading>
    <Text>Your account is ready.</Text>
  </Layout>
);

export const templates = {
  resetPassword: { subject: "Reset your password", component: ResetPassword },
  welcome: { subject: "Welcome", component: Welcome },
};

type Templates = typeof templates;

/** Renders a template to a ready-to-send message (HTML plus a plain-text alternative). */
export async function renderMail<K extends keyof Templates>(
  name: K,
  to: string,
  props: Parameters<Templates[K]["component"]>[0],
): Promise<Mail> {
  const element = templates[name].component(props as never);
  return {
    to,
    subject: templates[name].subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
