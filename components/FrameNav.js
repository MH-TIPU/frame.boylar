import Link from 'next/link';

// Keep this in step with the cards on the home page.
const FRAMES = [
  { href: '/smefair', label: 'ফটো ফ্রেম' },
  { href: '/fbcover', label: 'স্টল কভার' },
];

export default function FrameNav({ current }) {
  return (
    <nav className="frames">
      {FRAMES.map(f => (
        <Link key={f.href} href={f.href} className={f.href === current ? 'on' : undefined}>
          {f.label}
        </Link>
      ))}
    </nav>
  );
}
