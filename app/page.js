'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

// Dynamically import FullCalendar to prevent SSR issues
const FullCalendarWrapper = dynamic(
  () => Promise.all([
    import('@fullcalendar/react'),
    import('@fullcalendar/daygrid'),
    import('@fullcalendar/interaction'),
  ]).then(([reactMod, daygridMod, interactionMod]) => {
    return function Calendar(props) {
      return <reactMod.default plugins={[daygridMod.default, interactionMod.default]} {...props} />;
    };
  }),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ total_days: 0, total_present: 0, total_records: 0, total_students: 0 });
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayRecords, setDayRecords] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [filterYear, setFilterYear] = useState('');
  const [users, setUsers] = useState([]);
  
  const [user, setUser] = useState({});
  const [targetUser, setTargetUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
      setTargetUser(JSON.parse(localStorage.getItem('targetUser') || 'null'));
    }
  }, []);

  useEffect(() => {
    if (!user.id) return;
    fetchStats();
    fetchDates();
    if (user.role === 'admin') {
      fetchUsers();
    }
    // Clear out the day inspection panel when swapping users
    setSelectedDate(null);
    setDayRecords([]);
  }, [targetUser, user.id]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users for dropdown:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/attendance/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchDates = async () => {
    try {
      const { data } = await api.get('/attendance/dates');
      setDates(data);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const handleDateClick = async (info) => {
    const date = info.dateStr;
    setSelectedDate(date);
    try {
      const { data } = await api.get(`/attendance?date=${date}`);
      setDayRecords(data.records || []);
    } catch (err) {
      setDayRecords([]);
    }
  };

  const handleExportPDF = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    let url = `/api/report/pdf?token=${token}`;
    if (targetUser && targetUser.id) {
      url += `&userId=${targetUser.id}`;
    }
    
    window.location.href = url;
  };

  const handleUserSelect = (e) => {
    const val = e.target.value;
    if (val === 'all') {
      localStorage.removeItem('targetUser');
      setTargetUser(null);
    } else {
      const selected = users.find(u => u.id.toString() === val);
      if (selected) {
        const newUser = { id: selected.id, name: selected.name };
        localStorage.setItem('targetUser', JSON.stringify(newUser));
        setTargetUser(newUser);
      }
    }
  };

  const calendarEvents = dates.map((d) => ({
    title: `${d.present_count}/${d.total_count} Present`,
    date: d.date.split('T')[0],
    backgroundColor: (d.present_count / d.total_count) >= 0.75 ? '#22c55e' : (d.present_count / d.total_count) >= 0.5 ? '#f59e0b' : '#ef4444',
    borderColor: 'transparent',
    textColor: '#fff',
  }));

  const totalAbsent = parseInt(stats.total_records) - parseInt(stats.total_present);
  const avgAttendance = stats.total_records > 0
    ? ((stats.total_present / stats.total_records) * 100).toFixed(1)
    : '0.0';

  return (
    <PageWrapper>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>Welcome back, {targetUser ? `${targetUser.name} (Viewing as Admin)` : (user.name?.split(' - ')[0] || user.name || 'User')}</h1>
            <p className="subtitle">Here&apos;s an overview of your attendance records</p>
          </div>
          {user.role === 'admin' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="btn btn-accent" onClick={handleExportPDF} disabled={loadingReport}>
                {loadingReport ? <span className="spinner"></span> : targetUser ? `📄 Export Instructor's Report` : `📄 Export Global Report`}
              </button>
            </div>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_students}</span>
              <span className="stat-label">Total Students</span>
            </div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_days}</span>
              <span className="stat-label">Days Marked</span>
            </div>
          </div>
          <div className="stat-card stat-emerald">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-value">{stats.total_present}</span>
              <span className="stat-label">Total Present</span>
            </div>
          </div>
          <div className="stat-card stat-amber">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{avgAttendance}%</span>
              <span className="stat-label">Avg Attendance</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: user.role === 'admin' ? '250px 1.5fr 1fr' : '1.5fr 1fr' }}>
          
          {user.role === 'admin' && (
            <div className="users-list-card glass-card" style={{ maxHeight: '700px', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>👥 Instructors</h2>
              <div className="user-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className={`btn btn-sm ${!targetUser ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleUserSelect({ target: { value: 'all' } })}
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  🌍 Global View (All)
                </button>
                {users.map(u => (
                  <button
                    key={u.id}
                    className={`btn btn-sm ${targetUser?.id === u.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleUserSelect({ target: { value: u.id.toString() } })}
                    style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="calendar-card glass-card">
            <h2>📅 Attendance Calendar</h2>
            <FullCalendarWrapper
              initialView="dayGridMonth"
              events={calendarEvents}
              dateClick={handleDateClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              height="auto"
            />
          </div>

          <div className="day-detail-card glass-card">
            <h2>📋 {selectedDate ? `Attendance — ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'Click a date to view'}</h2>
            
            {user.role === 'admin' && user.email !== 'faculty@nimbus.com' && selectedDate && targetUser && (
              <button 
                className="btn btn-sm btn-accent" 
                style={{ marginBottom: '16px', display: 'flex', width: '100%' }}
                onClick={() => router.push(`/attendance?date=${selectedDate}`)}
              >
                ✎ Edit Attendance for {selectedDate}
              </button>
            )}

            {selectedDate && dayRecords.length > 0 ? (
              <div className="day-records">
                {(() => {
                  const availableYears = [...new Set(dayRecords.map(r => r.roll_number ? r.roll_number.substring(0, 2) : null).filter(Boolean))].sort();
                  
                  const getLabel = (yr) => {
                    if (yr === '21') return '[21] Super Final (2021)';
                    if (yr === '22') return '[22] Final Year (2022)';
                    if (yr === '23') return '[23] Third Year (2023)';
                    if (yr === '24') return '[24] Second Year (2024)';
                    if (yr === '25') return '[25] First Year (2025)';
                    return `[${yr}] Year ${yr}`;
                  };

                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <select 
                        value={filterYear} 
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                      >
                        <option value="">All Academic Years</option>
                        {availableYears.map(yr => (
                          <option key={yr} value={yr}>{getLabel(yr)}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
                {(() => {
                  const filtered = dayRecords
                    .filter(r => !filterYear || (r.roll_number && r.roll_number.startsWith(filterYear)))
                    .sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
                  
                  return (
                    <>
                      {filtered.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                          <p>No students found for this academic year</p>
                        </div>
                      ) : (
                        filtered.map((r) => (
                          <div key={r.student_id} className={`record-row ${r.status}`}>
                            <span className="record-name">{r.student_name} {r.roll_number ? <span style={{ color: '#0056b3', marginLeft: '6px', fontSize: '0.9em' }}>[{r.roll_number}]</span> : ''}</span>
                            <span className={`record-badge ${r.status}`}>
                              {r.status === 'present' ? '✅ Present' : '❌ Absent'}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="day-summary">
                        <span>Present: {filtered.filter(r => r.status === 'present').length}</span>
                        <span>Absent: {filtered.filter(r => r.status === 'absent').length}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : selectedDate ? (
              <div className="empty-state">
                <p>No attendance records for this date</p>
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a date on the calendar to view attendance details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
