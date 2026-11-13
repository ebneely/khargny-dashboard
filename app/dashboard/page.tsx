import { redirect } from 'next/navigation';

// Home is the Inbox: what is waiting on a person comes first (spec 002 US8).
export default function DashboardHomePage() {
  redirect('/dashboard/inbox');
}
