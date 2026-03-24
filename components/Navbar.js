'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState({});
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
      setTargetUser(JSON.parse(localStorage.getItem('targetUser') || 'null'));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('targetUser');
    router.push('/login');
  };

  const navLinkClass = (href) => {
    const isActive = pathname === href;
    return isActive ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="brand-icon">☁️</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '1px', color: '#fff' }}>NAP</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.3px', fontWeight: '500' }}>NIMBUS ATTENDANCE PORTAL</span>
          </div>
        </div>

        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          <span></span><span></span><span></span>
        </button>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          <Link href="/" className={navLinkClass('/')} onClick={() => setMobileOpen(false)}>
            <span className="nav-icon">📊</span> Dashboard
          </Link>
          {user.email !== 'faculty@nimbus.com' && (
            <>
              <Link href="/attendance" className={navLinkClass('/attendance')} onClick={() => setMobileOpen(false)}>
                <span className="nav-icon">✅</span> Attendance
              </Link>
              <Link href="/students" className={navLinkClass('/students')} onClick={() => setMobileOpen(false)}>
                <span className="nav-icon">👥</span> Students
              </Link>
            </>
          )}
          {user.role === 'admin' && user.email !== 'discipline@nimbus.com' && (
            <Link href="/users" className={navLinkClass('/users')} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon">⚙️</span> Users
            </Link>
          )}
          {(user.email === 'discipline@nimbus.com' || user.email === 'faculty@nimbus.com') && (
            <Link href="/discipline" className={navLinkClass('/discipline')} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon">🛡️</span> Status
            </Link>
          )}
        </div>

        <div className="navbar-user">
          <span className="user-name">{user.name || 'User'} {user.role === 'admin' && '(Admin)'}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
