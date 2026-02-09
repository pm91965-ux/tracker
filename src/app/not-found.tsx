'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex flex-col items-center justify-center min-h-screen bg-champagne text-gray-900">
        <h1 className="text-6xl font-bold text-rubyred mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-lg text-center mb-8">Could not find the requested resource.</p>
        <Link href="/" className="px-6 py-3 bg-rubyred hover:bg-rubyred-darker text-white rounded-lg shadow-md transition duration-300">
            Return Home
        </Link>
      </body>
    </html>
  );
}