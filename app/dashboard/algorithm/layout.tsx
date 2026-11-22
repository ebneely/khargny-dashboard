import { AlgorithmShell } from '@/components/admin/algorithm/algorithm-shell';

/** Every Algorithm page shares one header, one window switch, one count switch and one set of panels. */
export default function AlgorithmLayout({ children }: { children: React.ReactNode }) {
  return <AlgorithmShell>{children}</AlgorithmShell>;
}
