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

  // 📝 Self update state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/api').then(api => {
        window.api = api.default;
      });
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setModalError('New passwords do not match');
      return;
    }
    setSaving(true);
    setModalError('');
    setModalSuccess('');
    try {
      const api = (await import('@/lib/api')).default;
      await api.put('/profile/password', { currentPassword: passwords.current, newPassword: passwords.next });
      setModalSuccess('Password updated successfully!');
      setPasswords({ current: '', next: '', confirm: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const navLinkClass = (href) => {
    const isActive = pathname === href;
    return isActive ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="brand-logo-container">
            <img src="/logo.svg" alt="Nimbus" className="brand-logo" />
          </div>
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

          {/* 📱 Mobile User Actions */}
          <div className="mobile-user-actions">
            <button className="btn btn-outline btn-full" onClick={() => { setShowPasswordModal(true); setMobileOpen(false); }}>
              🔑 Change Password
            </button>
            <button className="btn btn-logout btn-full" onClick={handleLogout} style={{ marginTop: '4px' }}>
              Logout
            </button>
          </div>
        </div>

        <div className="navbar-user desktop-only">
          <span className="user-name">{user.name || 'User'} {user.role === 'admin' && '(Admin)'}</span>
          <button className="btn-logout" onClick={() => setShowPasswordModal(true)} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '6px 12px', fontSize: '0.75rem', marginRight: '6px' }}>🔑 Change Pass</button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(10, 10, 20, 0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Change Password</h2>
            {modalError && <div className="alert alert-error" style={{ marginBottom: '16px', padding: '10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.85rem' }}>{modalError}</div>}
            {modalSuccess && <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.85rem' }}>{modalSuccess}</div>}
            
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Password</label>
                <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(20, 20, 35, 0.6)' }} required />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Password</label>
                <input type="password" value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(20, 20, 35, 0.6)' }} required />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(20, 20, 35, 0.6)' }} required />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Password'}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowPasswordModal(false); setModalError(''); setModalSuccess(''); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
