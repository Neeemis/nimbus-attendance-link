'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  
  const pathname = usePathname();
  const [user, setUser] = useState({});
  const [targetUser, setTargetUser] = useState(null);

  const [dutyStudents, setDutyStudents] = useState([]);
  const [dutyDate, setDutyDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(u);
      setTargetUser(JSON.parse(localStorage.getItem('targetUser') || 'null'));
    }
  }, []);

  useEffect(() => {
    if (!user.id) return;
    fetchStats();
    fetchDates();
    fetchDuty(dutyDate);
    if (user.role === 'admin') {
      fetchUsers();
    }
    setSelectedDate(null);
    setDayRecords([]);
  }, [targetUser, user.id, pathname, dutyDate]);

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
      const { data } = await api.get(`/attendance/stats?_t=${Date.now()}`);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchDates = async () => {
    try {
      const { data } = await api.get(`/attendance/dates?_t=${Date.now()}`);
      setDates(data);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const fetchDuty = async (d) => {
    try {
      const { data } = await api.get(`/duty?date=${d}&global=true`);
      setDutyStudents(data.filter(s => s.on_duty));
    } catch (err) {
      console.error('Failed to fetch duty students:', err);
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
    if (targetUser && targetUser.id) url += `&userId=${targetUser.id}`;
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
    date: d.date ? new Date(d.date).toISOString().split('T')[0] : '',
    backgroundColor: (d.present_count / d.total_count) >= 0.75 ? '#22c55e' : (d.present_count / d.total_count) >= 0.5 ? '#f59e0b' : '#ef4444',
    borderColor: 'transparent',
    textColor: '#fff',
  }));

  const avgAttendance = stats.total_records > 0
    ? ((stats.total_present / stats.total_records) * 100).toFixed(1)
    : '0.0';

  return (
    <PageWrapper>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>Welcome back, {targetUser ? `${targetUser.name} (Viewing as Admin)` : (user.name?.split(' - ')[0] || user.name || 'User')}</h1>
            <p className="subtitle">Here&apos;s an overview of campus operations</p>
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
          <div className="stat-card stat-purple">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <span className="stat-value">{dutyStudents.length}</span>
              <span className="stat-label">On Duty ({dutyDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) ? 'Today' : 'Selected'})</span>
            </div>
          </div>
        </div>

        <div className="duty-banner-card glass-card" style={{ marginBottom: '24px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#6366f1', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ Student Duty List {dutyDate === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) ? '(Today)' : `(${dutyDate})`}
            </h2>
            
            {(user.role === 'admin' || user.email === 'faculty@nimbus.com') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Check Past Duty:</label>
                <input 
                  type="date" 
                  value={dutyDate} 
                  onChange={(e) => setDutyDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', width: '150px' }}
                />
              </div>
            )}
          </div>

          {dutyStudents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {dutyStudents.map(s => (
                <div key={s.id} className="record-row present" style={{ display: 'flex', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                  <span style={{ marginLeft: 'auto', background: '#6366f1', color: '#fff', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>{s.roll_number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', border: '1px dashed #ddd', borderRadius: '10px' }}>
              No students on duty for this date.
            </p>
          )}
        </div>

        <div className={`dashboard-grid ${user.role === 'admin' ? 'admin-grid' : ''}`}>
          {user.role === 'admin' && (
            <div className="users-list-card glass-card">
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
              headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
              height="auto"
            />
          </div>

          <div className="day-detail-card glass-card">
            <h2>📋 {selectedDate ? `Records — ${selectedDate}` : 'Click a date on Calendar'}</h2>
            
            {user.role === 'admin' && user.email !== 'faculty@nimbus.com' && selectedDate && targetUser && (
              <button 
                className="btn btn-sm btn-accent" 
                style={{ marginBottom: '16px', width: '100%' }}
                onClick={() => router.push(`/attendance?date=${selectedDate}`)}
              >
                ✎ Edit Attendance for {selectedDate}
              </button>
            )}

            {selectedDate && dayRecords.length > 0 ? (
              <div className="day-records">
                {dayRecords.map((r) => (
                  <div key={r.student_id} className={`record-row ${r.status}`}>
                    <span className="record-name">{r.student_name} <span style={{ color: '#0056b3', marginLeft: '6px', fontSize: '0.85em' }}>[{r.roll_number}]</span></span>
                    <span className={`record-badge ${r.status}`}>
                      {r.status === 'present' ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{selectedDate ? 'No records found' : 'Select a date'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
