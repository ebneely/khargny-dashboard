import { redirect } from 'next/navigation';

export default function NewSectionRoute() {
  redirect('/dashboard/ads/placements?add=section#add-section');
}
