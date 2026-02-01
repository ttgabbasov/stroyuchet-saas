import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard (auth will be checked by middleware)
  redirect('/dashboard');
}
