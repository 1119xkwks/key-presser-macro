import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'KeyPresserMacro',
    description: 'Desktop keyboard macro system',
    icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ko">
            <head>
                <meta
                    httpEquiv="Content-Security-Policy"
                    content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000 ws://localhost:3000;"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
