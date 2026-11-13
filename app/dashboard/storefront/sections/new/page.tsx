import { redirect } from 'next/navigation';

export default function NewSectionRoute() {
  redirect('/dashboard/collections?add=section');
}
