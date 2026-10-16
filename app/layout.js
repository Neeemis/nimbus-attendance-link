import './globals.css';

export const metadata = {
  title: 'Extension Tracker',
  description: 'Campus Status, Late-Night Extension & Duty Tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
