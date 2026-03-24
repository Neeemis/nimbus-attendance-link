import './globals.css';

export const metadata = {
  title: 'NIMBUS ATTENDANCE APP',
  description: 'Modern Attendance Management System',
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
