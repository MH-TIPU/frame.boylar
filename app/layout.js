import './globals.css';

import { SITE_URL } from '../lib/site';

// Site-wide defaults. Each page's layout overrides title, description and share image.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Boylar Frames', template: '%s | Boylar Frames' },
  description: 'Free photo frame maker by boylar.com. Add your photo and company logo, then download and share.',
  openGraph: { siteName: 'Boylar Frames', type: 'website', locale: 'bn_BD' },
  twitter: { card: 'summary_large_image' },
};

export const viewport = { themeColor: '#005c4b' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
