import { redirect } from 'next/navigation';

// No home page yet: send visitors to the only frame. Replace with a real index when there are more.
export default function Home() {
  redirect('/smefair');
}
