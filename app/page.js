import Link from 'next/link';

// Add a card here for each new frame.
const FRAMES = [
  { href: '/smefair', title: 'এসএমই মেলা ২০২৬ ফটো ফ্রেম', note: 'Your photo in the fair frame · "আমি আসছি, আপনি আসছেন তো?"' },
  { href: '/fbcover', title: 'স্টল আমন্ত্রণ ফেসবুক কভার', note: 'A Facebook cover inviting customers to your stall' },
  { href: '/fbcover-mobile', title: 'স্টল আমন্ত্রণ কভার · মোবাইলের জন্য', note: 'ফেসবুক মোবাইলে কভারের দুই পাশ কাটা পড়ে না · Laid out for Facebook’s mobile crop' },
];

export default function Home() {
  return (
    <>
      <header>
        <h1>১৩তম জাতীয় এসএমই পণ্য মেলা ২০২৬ · free banners for your business</h1>
      </header>
      <div className="cards">
        {FRAMES.map(f => (
          <Link className="card" key={f.href} href={f.href}>
            <b>{f.title}</b>
            <span>{f.note}</span>
          </Link>
        ))}
      </div>
      <footer>Made with ♥ by <a href="https://boylar.com" target="_blank" rel="noopener">boylar.com</a></footer>
    </>
  );
}
