'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

function AttendanceContent() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');
  
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(queryDate || new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (date) fetchAttendance(date);
  }, [date]);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const fetchAttendance = async (d) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance?date=${d}`);
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      setLocked((user.role === 'admin' && user.email !== 'faculty@nimbus.com') ? false : data.locked || user.email === 'faculty@nimbus.com');
      const map = {};
      data.records.forEach((r) => {
        map[r.student_id] = r.status === 'present';
      });
      setAttendance(map);
    } catch (err) {
      setAttendance({});
      setLocked(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId) => {
    if (locked) return;
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const selectAll = () => {
    if (locked) return;
    const map = {};
    students.forEach((s) => { map[s.id] = true; });
    setAttendance(map);
  };

  const deselectAll = () => {
    if (locked) return;
    const map = {};
    students.forEach((s) => { map[s.id] = false; });
    setAttendance(map);
  };

  const handleSubmit = async () => {
    if (locked) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id] ? 'present' : 'absent',
      }));
      await api.post('/attendance', { date, records });
      setLocked(true);
      setMessage({ type: 'success', text: 'Attendance submitted successfully! This record is now locked.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <div>
          <h1>Mark Attendance</h1>
          <p className="subtitle">Select a date and mark student attendance</p>
        </div>
      </div>

      <div className="attendance-controls glass-card">
        <div className="date-picker-group">
          <label htmlFor="att-date">📅 Attendance for Today</label>
          <input
            id="att-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
            max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
          />
        </div>

        {locked && (
          <div className="lock-badge">
            🔒 Attendance Locked
          </div>
        )}

        {!locked && students.length > 0 && (
          <div className="bulk-actions">
            <button className="btn btn-sm btn-outline" onClick={selectAll}>Select All</button>
            <button className="btn btn-sm btn-outline" onClick={deselectAll}>Deselect All</button>
          </div>
        )}
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="attendance-summary glass-card">
        <div className="summary-item present">
          <span className="summary-count">{presentCount}</span>
          <span className="summary-label">Present</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item absent">
          <span className="summary-count">{absentCount}</span>
          <span className="summary-label">Absent</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item total">
          <span className="summary-count">{students.length}</span>
          <span className="summary-label">Total</span>
        </div>
      </div>

      {students.some(s => s.extension_cancelled) && (
        <div className="alert alert-error fade-in" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', margin: '20px 0' }}>
          <span style={{ fontSize: '1.4rem' }}>⛔</span>
          <div style={{ flex: 1, fontSize: '0.9rem' }}>
            <strong>Late Extension Alert:</strong> {students.filter(s => s.extension_cancelled).length} student(s) in this list have their late-night extension cancelled by Faculty / Discipline.
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state"><span className="spinner"></span> Loading...</div>
      ) : students.length === 0 ? (
        <div className="empty-state glass-card">
          <p>No students found. Add students first from the Students page.</p>
        </div>
      ) : (
        <>
          <div className="student-attendance-list">
            {students.map((student, index) => (
              <div
                key={student.id}
                className={`attendance-row ${attendance[student.id] ? 'marked-present' : 'marked-absent'} ${locked ? 'locked' : ''}`}
                onClick={() => toggleAttendance(student.id)}
                style={{ borderLeft: student.extension_cancelled ? '4px solid #ef4444' : undefined }}
              >
                <span className="row-number">{index + 1}</span>
                <span className="row-name" style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{student.name}</span>
                  {student.roll_number ? <span style={{ color: '#0056b3', fontSize: '0.9em' }}>[{student.roll_number}]</span> : ''}
                  {student.extension_cancelled && (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      ⛔ Ext. Cancelled
                    </span>
                  )}
                </span>
                <div className={`toggle-switch ${attendance[student.id] ? 'on' : 'off'}`}>
                  <div className="toggle-knob"></div>
                </div>
                <span className={`row-status ${attendance[student.id] ? 'present' : 'absent'}`}>
                  {attendance[student.id] ? 'Present' : 'Absent'}
                </span>
              </div>
            ))}
          </div>

          <div className="submit-bar">
            {locked ? (
              <div className="submission-success-container fade-in">
                <button className="btn btn-dead btn-lg" disabled>
                   Attendance Recorded 
                </button>
                <div className="status-indicator">
                   <p className="success-footer-msg mt-3">
                    Attendance submitted
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-lg shine-effect"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <><span className="spinner"></span> Submitting...</> : '📝 Submit Attendance'}
                </button>
                <p className="submit-warning">⚠️ Once submitted, attendance cannot be modified for this session</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <PageWrapper>
      <Suspense fallback={<div className="loading-state"><span className="spinner"></span> Loading framework modules...</div>}>
        <AttendanceContent />
      </Suspense>
    </PageWrapper>
  );
}
