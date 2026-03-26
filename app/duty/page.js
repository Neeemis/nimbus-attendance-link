'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

export default function DutyRoasterPage() {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dutySet, setDutySet] = useState(new Set());

  useEffect(() => {
    fetchDutyList();
  }, [date]);

  const fetchDutyList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/duty?date=${date}`);
      setStudents(data);
      const onDuty = new Set(data.filter(s => s.on_duty).map(s => s.id));
      setDutySet(onDuty);
    } catch (err) {
      console.error('Duty fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDuty = (id) => {
    const next = new Set(dutySet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDutySet(next);
  };

  const saveDuty = async () => {
    setMessage({ type: '', text: '' });
    try {
      await api.post('/duty', { date, studentIds: Array.from(dutySet) });
      setMessage({ type: 'success', text: 'Duty roaster updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Save failed.' });
    }
  };

  return (
    <PageWrapper>
      <div className="attendance-page">
        <div className="page-header">
          <h1>📋 Duty Roaster</h1>
          <p className="subtitle">Choose students for Today's on-duty list</p>
        </div>

        <div className="attendance-controls glass-card">
          <div className="date-picker-group">
            <label>📅 Selected Day</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              max={new Date().toISOString().split('T')[0]} 
            />
          </div>
          <button className="btn btn-primary" onClick={saveDuty}>💾 Save Duty List</button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ margin: '20px 0' }}>{message.text}</div>
        )}

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <div className="student-attendance-list">
            {students.map((s, idx) => (
              <div 
                key={s.id} 
                className={`attendance-row ${dutySet.has(s.id) ? 'marked-present' : 'marked-absent'}`}
                onClick={() => toggleDuty(s.id)}
                style={{ cursor: 'pointer', borderLeft: dutySet.has(s.id) ? '4px solid #6366f1' : '4px solid transparent' }}
              >
                <span className="row-number">{idx + 1}</span>
                <span className="row-name" style={{ flex: 1, textAlign: 'left' }}>
                  {s.name} <span style={{ color: '#0056b3', marginLeft: '6px', fontSize: '0.9em' }}>[{s.roll_number}]</span>
                </span>
                <div className={`toggle-switch ${dutySet.has(s.id) ? 'on' : 'off'}`}>
                  <div className="toggle-knob"></div>
                </div>
                <span className={`row-status ${dutySet.has(s.id) ? 'present' : 'absent'}`}>
                  {dutySet.has(s.id) ? 'On Duty' : 'No Duty'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
