'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

export default function DisciplinePage() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHostel, setFilterHostel] = useState('');
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
      setError('Failed to load students. Ensure you have Discipline access.');
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

  const handleToggleDuty = async (studentId, currentOnDuty) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    // Calculate new set of on-duty student IDs
    const onDutyStudents = students.filter(s => s.on_duty).map(s => s.id);
    let newOnDutyIds;
    if (currentOnDuty) {
      newOnDutyIds = onDutyStudents.filter(id => id !== studentId);
    } else {
      newOnDutyIds = [...onDutyStudents, studentId];
    }

    try {
      await api.post('/duty', { date: today, studentIds: newOnDutyIds });
      setStudents(prev => 
        prev.map(s => (s.id === studentId ? { ...s, on_duty: !currentOnDuty } : s))
      );
    } catch (err) {
      console.error('Failed to toggle duty:', err);
      setError('Failed to update duty roaster.');
    }
  };

  const filteredStudents = students.filter(student => {
    const safeName = student.name || '';
    const safeSearch = searchTerm || '';
    const matchesSearch = safeName.toLowerCase().includes(safeSearch.toLowerCase());
    const matchesHostel = filterHostel === '' || student.hostel === filterHostel;
    return matchesSearch && matchesHostel;
  });

  const totalGirls = filteredStudents.length;
  const inCampusCount = filteredStudents.filter((s) => s.campus_status === 'in').length;
  const outCampusCount = totalGirls - inCampusCount;

  const uniqueHostels = [...new Set(students.map(s => {
    let h = s.hostel || '';
    if (/ambika|ambi/i.test(h)) return 'Ambika Girls Hostel';
    if (/satpura/i.test(h)) return 'Satpura Girls Hostel';
    if (/parvati/i.test(h)) return 'Parvati Girls Hostel';
    if (/mani|mahesh/i.test(h)) return 'Manimahesh Hostel';
    return h;
  }).filter(h => h))].sort();

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
          <div className="summary-item total">
            <span className="summary-count">{totalGirls}</span>
            <span className="summary-label">Total Students</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><span className="spinner"></span> Loading data...</div>
        ) : (
          <>
            <div className="filter-controls glass-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', padding: '16px 24px' }}>
              <input 
                type="text" 
                placeholder="Search student name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 2, minWidth: 0 }}
              />
              <select 
                value={filterHostel} 
                onChange={(e) => setFilterHostel(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              >
                <option value="">All Hostels</option>
                {uniqueHostels.map(hostel => (
                  <option key={hostel} value={hostel}>{hostel}</option>
                ))}
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
                  <span style={{ flex: 1 }}>Student Info</span>
                  <span style={{ width: '60px', textAlign: 'center', marginRight: '20px' }}>Duty</span>
                  <span style={{ width: '180px', textAlign: 'center' }}>Campus Status</span>
                </div>
                {filteredStudents.map((student, index) => {
                  const isIn = student.campus_status === 'in';
                  return (
                    <div
                      key={student.id}
                      className={`attendance-row ${isIn ? 'marked-present' : 'marked-absent'}`}
                      style={{ cursor: 'default' }}
                    >
                      <span className="row-number">{index + 1}</span>
                      <div className="student-info" style={{ flex: 1, textAlign: 'left' }}>
                        <div className="student-name">{student.name}{student.roll_number ? ` [${student.roll_number}]` : ''}</div>
                        <div className="student-club" style={{ fontSize: '0.85em', color: '#3b82f6', fontWeight: '500', marginTop: '2px' }}>
                          Club: {student.club_name || 'Unassigned'}
                        </div>
                        <div className="student-meta" style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                          {student.hostel || 'No Hostel specified'}
                        </div>
                      </div>
                      
                      <div style={{ width: '60px', marginRight: '20px', display: 'flex', justifyContent: 'center' }}>
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleToggleDuty(student.id, student.on_duty); }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '4px' }}
                        >
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '6px', 
                            border: '2px solid #6366f1', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: student.on_duty ? '#6366f1' : 'transparent',
                            transition: 'all 0.2s'
                          }}>
                            {student.on_duty && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                          </div>
                        </div>
                      </div>

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
