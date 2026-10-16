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
  const [cancelledStudents, setCancelledStudents] = useState([]);
  
  const pathname = usePathname();
  const [user, setUser] = useState({});
  const [targetUser, setTargetUser] = useState(null);

  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [dutyStudents, setDutyStudents] = useState([]);
  const [dutyDate, setDutyDate] = useState(todayIST);

  // 📅 Calendar Date Span Selection State
  const [spanStart, setSpanStart] = useState(todayIST);
  const [spanEnd, setSpanEnd] = useState(todayIST);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(u);
      setTargetUser(JSON.parse(localStorage.getItem('targetUser') || 'null'));
    }
  }, []);

  const fetchCancelledStudents = async () => {
    try {
      const { data } = await api.get('/students');
      setCancelledStudents(data.filter(s => s.extension_cancelled));
    } catch (err) {
      console.error('Failed to load students for extension check:', err);
    }
  };

  useEffect(() => {
    if (!user.id) return;
    fetchStats();
    fetchDates();
    fetchDuty(dutyDate);
    fetchCancelledStudents();
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
    setDutyDate(date);
    setSpanStart(date);
    setSpanEnd(date);
    try {
      const { data } = await api.get(`/attendance?date=${date}`);
      setDayRecords(data.records || []);
    } catch (err) {
      setDayRecords([]);
    }
  };

  // 📅 Interactive Calendar Span Drag Selection
  const handleCalendarSpanSelect = (selectInfo) => {
    const startStr = selectInfo.startStr;
    const end = new Date(selectInfo.endStr);
    end.setDate(end.getDate() - 1);
    const inclusiveEndStr = end.toISOString().split('T')[0];
    
    setSpanStart(startStr);
    setSpanEnd(inclusiveEndStr < startStr ? startStr : inclusiveEndStr);
  };

  const setSpanPreset = (type) => {
    const now = new Date();
    if (type === 'today') {
      setSpanStart(todayIST);
      setSpanEnd(todayIST);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setSpanStart(past.toISOString().split('T')[0]);
      setSpanEnd(todayIST);
    } else if (type === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setSpanStart(past.toISOString().split('T')[0]);
      setSpanEnd(todayIST);
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setSpanStart(firstDay);
      setSpanEnd(todayIST);
    }
  };

  const downloadSpanAttendancePDF = () => {
    const token = localStorage.getItem('token');
    let url = `/api/report/pdf?startDate=${spanStart}&endDate=${spanEnd}&token=${token}`;
    if (targetUser && targetUser.id) url += `&userId=${targetUser.id}`;
    window.open(url, '_blank');
  };

  const downloadSpanDutyPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/duty/report/pdf?startDate=${spanStart}&endDate=${spanEnd}&token=${token}`, '_blank');
  };

  const downloadSpanMovementPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/discipline/report/pdf?startDate=${spanStart}&endDate=${spanEnd}&token=${token}`, '_blank');
  };

  const downloadDayDutyPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/duty/report/pdf?date=${dutyDate}&token=${token}`, '_blank');
  };

  const handleExportPDF = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let url = `/api/report/pdf?token=${token}`;
    if (targetUser && targetUser.id) url += `&userId=${targetUser.id}`;
    window.open(url, '_blank');
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

  const daysCount = Math.max(1, Math.round((new Date(spanEnd) - new Date(spanStart)) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <PageWrapper>
      <div className="dashboard-page fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Welcome back, {targetUser ? `${targetUser.name} (Viewing as Admin)` : (user.name?.split(' - ')[0] || user.name || 'User')}</h1>
            <p className="subtitle">Here&apos;s an overview of campus operations & reporting</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-accent shine-effect" onClick={downloadSpanAttendancePDF} disabled={loadingReport}>
              📄 Export Cumulative Report
            </button>
          </div>
        </div>
 
        {cancelledStudents.length > 0 && (
          <div className="alert alert-error fade-in" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⛔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                Late-Night Extension Notice:
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#fca5a5' }}>
                {cancelledStudents.length} student(s) in your club have had their late-night extension <strong>CANCELLED</strong> by Faculty Incharge. They are not permitted late-night campus hours:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {cancelledStudents.map(s => (
                  <span key={s.id} style={{
                    background: 'rgba(239, 68, 68, 0.25)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {s.name} {s.roll_number ? `[${s.roll_number}]` : ''}
                    {s.extension_cancelled_by ? ` (by ${s.extension_cancelled_by.split(' ')[0]})` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

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
              <span className="stat-label">On Duty ({dutyDate === todayIST ? 'Today' : dutyDate})</span>
            </div>
          </div>
        </div>

        {/* 🛡️ Student Duty List Card for Any Selected Date */}
        <div className="duty-banner-card glass-card" style={{ marginBottom: '24px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#6366f1', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ Student Duty List {dutyDate === todayIST ? '(Today)' : `(${dutyDate})`}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label htmlFor="dashboard-duty-date" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Check Any Day:</label>
                <input 
                  id="dashboard-duty-date"
                  type="date" 
                  value={dutyDate} 
                  onChange={(e) => setDutyDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(15, 23, 42, 0.6)', color: '#fff', fontSize: '0.9rem', width: '145px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => {
                    const d = new Date(dutyDate);
                    d.setDate(d.getDate() - 1);
                    setDutyDate(d.toISOString().split('T')[0]);
                  }} 
                  title="Previous Day"
                >
                  ◀
                </button>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => setDutyDate(todayIST)} 
                  title="Today"
                >
                  Today
                </button>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => {
                    const d = new Date(dutyDate);
                    d.setDate(d.getDate() + 1);
                    setDutyDate(d.toISOString().split('T')[0]);
                  }} 
                  title="Next Day"
                >
                  ▶
                </button>
              </div>
              <button 
                className="btn btn-sm btn-primary shine-effect" 
                onClick={downloadDayDutyPDF}
                title="Download PDF of students on duty for this date"
              >
                📄 Export Day Duty PDF
              </button>
            </div>
          </div>

          {dutyStudents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {dutyStudents.map(s => (
                <div key={s.id} className="record-row present" style={{ display: 'flex', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                  <span style={{ marginLeft: 'auto', background: '#6366f1', color: '#fff', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>{s.roll_number || 'N/A'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
              No students on duty for {dutyDate}.
            </p>
          )}
        </div>

        {/* 📅 Date Span & Multi-Report Export Hub */}
        <div className="glass-card" style={{ marginBottom: '24px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 Calendar Span & Duration PDF Export Hub
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Select a span below or drag across dates on the calendar to download duration reports:
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setSpanPreset('today')}>Today</button>
              <button className="btn btn-sm btn-outline" onClick={() => setSpanPreset('7days')}>Last 7 Days</button>
              <button className="btn btn-sm btn-outline" onClick={() => setSpanPreset('30days')}>Last 30 Days</button>
              <button className="btn btn-sm btn-outline" onClick={() => setSpanPreset('month')}>This Month</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 18px', background: 'rgba(15, 23, 42, 0.55)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>From:</label>
                <input 
                  type="date" 
                  value={spanStart} 
                  onChange={e => setSpanStart(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: 'rgba(30, 41, 59, 0.8)', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>
              <span style={{ color: '#64748b' }}>➔</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>To:</label>
                <input 
                  type="date" 
                  value={spanEnd} 
                  onChange={e => setSpanEnd(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: 'rgba(30, 41, 59, 0.8)', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                {spanStart === spanEnd ? 'Single Day' : `Duration: ${daysCount} Days`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-primary shine-effect" onClick={downloadSpanAttendancePDF} title="Download Attendance PDF for this duration">
                📊 Attendance PDF
              </button>
              <button className="btn btn-sm btn-accent shine-effect" onClick={downloadSpanDutyPDF} title="Download Discipline Duty Roaster PDF for this duration">
                📋 Duty Roaster PDF
              </button>
              <button className="btn btn-sm btn-outline" onClick={downloadSpanMovementPDF} title="Download Campus Entry/Exit Logs PDF for this duration">
                🚪 Movement PDF
              </button>
            </div>
          </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ margin: 0 }}>📅 Interactive Calendar</h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                💡 Click or drag dates to select a duration span
              </span>
            </div>
            <FullCalendarWrapper
              initialView="dayGridMonth"
              events={calendarEvents}
              dateClick={handleDateClick}
              selectable={true}
              selectMirror={true}
              select={handleCalendarSpanSelect}
              unselectAuto={false}
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
