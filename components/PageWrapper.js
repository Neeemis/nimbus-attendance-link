'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';

export default function PageWrapper({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner"></span> Validating...
      </div>
    );
  }

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'transparent' }}>
      <Navbar />
      <main className="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: 'auto', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}>
        made by Nimish
      </footer>
    </div>
  );
}
