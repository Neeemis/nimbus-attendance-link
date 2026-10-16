'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

export default function DisciplinePage() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHostel, setFilterHostel] = useState('');
  const [filterExtension, setFilterExtension] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState({});
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    }
  }, []);

  const fetchGirls = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/discipline/girls?_t=${Date.now()}`);
      setStudents(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch discipline data:', err);
      setError(err.response?.data?.error || 'Failed to load students. Ensure you have Discipline access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGirls();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'in' ? 'out' : 'in';
    try {
      await api.put(`/discipline/girls/${id}/status`, { status: newStatus });
      setStudents((prev) => 
        prev.map((s) => (s.id === id ? { ...s, campus_status: newStatus } : s))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update campus status.');
    }
  };

  const handleToggleExtension = async (student) => {
    const isCurrentlyCancelled = Boolean(student.extension_cancelled);
    const newCancelled = !isCurrentlyCancelled;

    let reason = '';
    if (newCancelled) {
      const userReason = window.prompt(
        `Are you sure you want to CANCEL late-night extension for ${student.name} [${student.roll_number || 'N/A'}]?\n\nEnter reason (optional):`,
        'Curfew violation / Discipline order'
      );
      if (userReason === null) return; // User cancelled prompt
      reason = userReason;
    } else {
      if (!window.confirm(`Reinstate late-night extension permission for ${student.name}?`)) return;
    }

    setActionLoading(student.id);
    try {
      const { data } = await api.put(`/discipline/extension/${student.id}`, {
        cancelled: newCancelled,
        reason: reason
      });
      setStudents(prev => prev.map(s => s.id === student.id ? { 
        ...s, 
        extension_cancelled: data.extension_cancelled,
        extension_cancelled_at: data.extension_cancelled_at,
        extension_cancelled_by: data.extension_cancelled_by,
        extension_cancelled_reason: data.extension_cancelled_reason
      } : s));
    } catch (err) {
      console.error('Failed to toggle extension:', err);
      setError(err.response?.data?.error || 'Failed to update extension.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStudents = students.filter(student => {
    const safeName = student.name || '';
    const safeSearch = searchTerm || '';
    const matchesSearch = safeName.toLowerCase().includes(safeSearch.toLowerCase());
    const matchesHostel = filterHostel === '' || student.hostel === filterHostel;
    const matchesExtension = filterExtension === ''
      || (filterExtension === 'cancelled' && student.extension_cancelled)
      || (filterExtension === 'active' && !student.extension_cancelled);
    return matchesSearch && matchesHostel && matchesExtension;
  });

  const totalGirls = filteredStudents.length;
  const inCampusCount = filteredStudents.filter((s) => s.campus_status === 'in').length;
  const outCampusCount = totalGirls - inCampusCount;
  const cancelledExtensionsCount = filteredStudents.filter((s) => s.extension_cancelled).length;
  const canModifyExtension = user.role === 'admin' || user.email === 'discipline@nimbus.com' || user.email === 'faculty@nimbus.com';

  const GIRLS_HOSTELS = ['Ambika Girls Hostel', 'Satpura Girls Hostel', 'Parvati Girls Hostel'];
  
  const foundHostels = [...new Set(students.map(s => {
    let h = s.hostel || '';
    if (/ambika|ambi/i.test(h)) return 'Ambika Girls Hostel';
    if (/satpura/i.test(h)) return 'Satpura Girls Hostel';
    if (/parvati/i.test(h)) return 'Parvati Girls Hostel';
    // Don't auto-map to Manimahesh here if we want only girls hostels shown by default, 
    // but check if they have girls
    return h;
  }).filter(h => h))];

  // Merge known girls hostels with any other found ones
  const displayedHostels = Array.from(new Set([...GIRLS_HOSTELS, ...foundHostels])).sort();

  return (
    <PageWrapper>
      <div className="students-page fade-in">
        <div className="page-header sticky-header">
          <div>
            <h1>🛡️ Campus Status Tracker</h1>
            <p className="subtitle">Manage student status and duty roaster for today</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="date-picker-mini glass-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', marginBottom: 0 }}>
              <label htmlFor="report-date" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>📅 Logs From:</label>
              <input 
                id="report-date"
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
              />
            </div>
            {user.email && (
              <button 
                className="btn btn-accent shine-effect" 
                onClick={() => {
                  const token = localStorage.getItem('token');
                  window.open(`/api/discipline/report/pdf?token=${token}&date=${reportDate}`, '_blank');
                }}
              >
                📄 Export Status PDF
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="attendance-summary glass-card">
          <div className="summary-item present">
            <span className="summary-count">{inCampusCount}</span>
            <span className="summary-label">In Campus</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item absent">
            <span className="summary-count">{outCampusCount}</span>
            <span className="summary-label">Out Campus</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item" style={{ color: cancelledExtensionsCount > 0 ? '#ef4444' : 'inherit' }}>
            <span className="summary-count" style={{ color: cancelledExtensionsCount > 0 ? '#ef4444' : 'inherit' }}>{cancelledExtensionsCount}</span>
            <span className="summary-label" style={{ color: cancelledExtensionsCount > 0 ? '#f87171' : 'inherit' }}>Ext. Cancelled</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item total">
            <span className="summary-count">{totalGirls}</span>
            <span className="summary-label">Total Students</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><span className="spinner"></span> Loading data...</div>
        ) : (
          <>
            <div className="filter-controls glass-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', padding: '16px 24px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Search student name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 2, minWidth: '180px' }}
              />
              <select 
                value={filterHostel} 
                onChange={(e) => setFilterHostel(e.target.value)}
                style={{ flex: 1, minWidth: '140px' }}
              >
                <option value="">All Hostels</option>
                {displayedHostels.map(hostel => (
                  <option key={hostel} value={hostel}>{hostel}</option>
                ))}
              </select>
              <select 
                value={filterExtension} 
                onChange={(e) => setFilterExtension(e.target.value)}
                style={{ flex: 1, minWidth: '140px' }}
              >
                <option value="">All Extensions</option>
                <option value="active">Active / Permitted</option>
                <option value="cancelled">⛔ Cancelled Only</option>
              </select>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="empty-state glass-card">
                <p>No students found matching your search.</p>
              </div>
            ) : (
              <div className="student-attendance-list">
                <div className="attendance-header" style={{ padding: '12px 20px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '40px' }}>#</span>
                  <span style={{ flex: 1.2 }}>Student Info</span>
                  <span style={{ width: '220px', textAlign: 'center' }}>Late Extension</span>
                  <span style={{ width: '180px', textAlign: 'center' }}>Campus Status</span>
                </div>
                {filteredStudents.map((student, index) => {
                  const isIn = student.campus_status === 'in';
                  return (
                    <div
                      key={student.id}
                      className={`attendance-row ${isIn ? 'marked-present' : 'marked-absent'}`}
                      style={{ cursor: 'default', borderLeft: student.extension_cancelled ? '4px solid #ef4444' : undefined }}
                    >
                      <span className="row-number">{index + 1}</span>
                      <div className="student-info" style={{ flex: 1.2, textAlign: 'left' }}>
                        <div className="student-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{student.name}{student.roll_number ? ` [${student.roll_number}]` : ''}</span>
                          {student.extension_cancelled && (
                            <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              CANCELLED
                            </span>
                          )}
                        </div>
                        <div className="student-club" style={{ fontSize: '0.85em', color: '#3b82f6', fontWeight: '500', marginTop: '2px' }}>
                          Club: {student.club_name || 'Unassigned'}
                        </div>
                        <div className="student-meta" style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                          {student.hostel || 'No Hostel specified'}
                        </div>
                      </div>
                      
                      {/* Late Extension Status & Cancel Action */}
                      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: student.extension_cancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: student.extension_cancelled ? '#ef4444' : '#22c55e',
                          border: student.extension_cancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                          textAlign: 'center'
                        }}>
                          {student.extension_cancelled ? '⛔ Ext. Cancelled' : '✅ Ext. Active'}
                        </span>
                        {student.extension_cancelled && (
                          <span style={{ fontSize: '0.68rem', color: '#f87171', textAlign: 'center', maxWidth: '200px', lineHeight: 1.2 }}>
                            By: {student.extension_cancelled_by || 'Faculty/Discipline'}
                            {student.extension_cancelled_reason ? ` (${student.extension_cancelled_reason})` : ''}
                          </span>
                        )}
                        {canModifyExtension && (
                          <button 
                            className="btn btn-sm"
                            disabled={actionLoading === student.id}
                            onClick={() => handleToggleExtension(student)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.75rem',
                              borderRadius: '8px',
                              background: student.extension_cancelled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: student.extension_cancelled ? '#22c55e' : '#ef4444',
                              border: student.extension_cancelled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            {actionLoading === student.id ? 'Updating...' : (student.extension_cancelled ? 'Reinstate Ext.' : 'Cancel Ext.')}
                          </button>
                        )}
                      </div>

                      {/* Campus Status */}
                      <div style={{ width: '180px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span className={`row-status ${isIn ? 'present' : 'absent'}`} style={{ minWidth: '80px', textAlign: 'center' }}>
                          {isIn ? 'Inside' : 'Outside'}
                        </span>
                        {user.email !== 'faculty@nimbus.com' && (
                          <button 
                            className={`btn btn-sm ${isIn ? 'btn-outline' : 'btn-primary'}`} 
                            onClick={() => handleToggleStatus(student.id, student.campus_status)}
                          >
                            Mark {isIn ? 'OUT' : 'IN'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
