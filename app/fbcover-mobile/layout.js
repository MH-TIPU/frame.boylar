const title = 'এসএমই মেলা ২০২৬ মোবাইল ফেসবুক কভার · SME Fair 2026 Mobile Facebook Cover';
const description =
  'ফেসবুক মোবাইল অ্যাপে পেজ কভারের দুই পাশ কেটে যায় আর প্রোফাইল ছবি মাঝখানটা ঢেকে দেয়। ' +
  'এই কভারে সব লেখা তার বাইরে রাখা, তাই ফোনেও পুরোটা পড়া যায়। ' +
  'A stall invitation cover laid out to survive Facebook\'s mobile crop and profile photo.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/fbcover-mobile' },
  openGraph: {
    title,
    description,
    url: '/fbcover-mobile',
    siteName: 'Boylar Frames',
    type: 'website',
    locale: 'bn_BD',
    images: [{ url: '/og/fbcover.jpg', width: 1200, height: 630, alt: 'SME Fair 2026 stall invitation cover for mobile' }],
  },
};

export default function FbCoverMobileLayout({ children }) {
  return children;
}
