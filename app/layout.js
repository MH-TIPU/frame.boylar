import './globals.css';

export const metadata = { title: 'Boylar Frames' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
