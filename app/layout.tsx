import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hello World",
  description: "Next.js project cleaned by Antigravity",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000 ws://localhost:3000;"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
