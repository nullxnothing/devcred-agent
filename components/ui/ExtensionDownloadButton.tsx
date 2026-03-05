'use client';

import { useRouter } from 'next/navigation';
import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ExtensionDownloadButton() {
  const router = useRouter();

  const handleDownload = () => {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = '/blacklist-extension.zip';
    link.download = 'blacklist-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Redirect to docs after a short delay
    setTimeout(() => {
      router.push('/docs#extension');
    }, 500);
  };

  return (
    <Button variant="primary" className="gap-2" onClick={handleDownload}>
      <Chrome size={18} />
      Download Extension
    </Button>
  );
}
