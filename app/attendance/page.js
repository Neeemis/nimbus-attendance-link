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
          <label htmlFor="att-date">📅 Select Date</label>
          <input
            id="att-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
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
              >
                <span className="row-number">{index + 1}</span>
                <span className="row-name" style={{ flex: 1, textAlign: 'left' }}>
                  {student.name} {student.roll_number ? <span style={{ color: '#0056b3', marginLeft: '6px', fontSize: '0.9em' }}>[{student.roll_number}]</span> : ''}
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

          {!locked && (
            <div className="submit-bar">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <span className="spinner"></span> : '📝 Submit Attendance'}
              </button>
              <p className="submit-warning">⚠️ Once submitted, attendance cannot be modified</p>
            </div>
          )}
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
