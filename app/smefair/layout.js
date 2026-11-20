const title = 'এসএমই মেলা ২০২৬ ফটো ফ্রেম · SME Fair 2026 Photo Frame';
const description =
  'আপনার ছবি ও কোম্পানির লোগো দিয়ে ১৩তম জাতীয় এসএমই পণ্য মেলা ২০২৬-এর ফটো ফ্রেম তৈরি করুন, ডাউনলোড করে ফেসবুকে শেয়ার করুন। ' +
  'Make your SME Fair 2026 photo frame with your photo and company logo. Free to download and share.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/smefair' },
  // A page's openGraph replaces the site-wide one, so the shared fields are repeated here.
  openGraph: {
    title,
    description,
    url: '/smefair',
    siteName: 'Boylar Frames',
    type: 'website',
    locale: 'bn_BD',
    images: [{ url: '/og/smefair.jpg', width: 1200, height: 630, alt: 'SME Fair 2026 photo frame' }],
  },
};

export default function SmeFairLayout({ children }) {
  return children;
}
