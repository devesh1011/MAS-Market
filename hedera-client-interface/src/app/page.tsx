'use client';

import { Navbar } from '@/components/navbar';
import { Landing } from '@/components/landing';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex overflow-y-auto">
        <Landing />
      </main>
    </div>
  );
}
