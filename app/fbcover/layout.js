const title = 'এসএমই মেলা ২০২৬ ফেসবুক কভার · SME Fair 2026 Facebook Cover';
const description =
  'আপনার লোগো, স্টলের ছবি ও স্টল নম্বর দিয়ে ১৩তম জাতীয় এসএমই পণ্য মেলা ২০২৬-এর ফেসবুক কভার বানান। ' +
  'Make a Facebook cover inviting customers to your stall at the SME Fair 2026. Free to download and share.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/fbcover' },
  openGraph: {
    title,
    description,
    url: '/fbcover',
    siteName: 'Boylar Frames',
    type: 'website',
    locale: 'bn_BD',
    images: [{ url: '/og/fbcover.jpg', width: 1200, height: 630, alt: 'SME Fair 2026 stall invitation cover' }],
  },
};

export default function FbCoverLayout({ children }) {
  return children;
}
