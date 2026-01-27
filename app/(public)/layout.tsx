import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream text-dark font-sans selection:bg-accent selection:text-white">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
