import { dashRedirect } from '@/lib/dash-lang-server';

export default async function Home() {
  await dashRedirect("/dashboard");
}
