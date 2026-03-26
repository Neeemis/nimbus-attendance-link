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

          <div className="bulk-actions" style={{ marginTop: '16px' }}>
            <button className="btn btn-sm btn-outline" onClick={() => {
              const allIds = students.map(s => s.id);
              if (dutySet.size === students.length) setDutySet(new Set());
              else setDutySet(new Set(allIds));
            }}>
              {dutySet.size === students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ margin: '20px 0' }}>{message.text}</div>
        )}

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : (
          <div className="student-attendance-list">
            <div className="attendance-header" style={{ padding: '12px 20px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', borderBottom: '1px solid #eee' }}>
              <span style={{ width: '40px' }}>#</span>
              <span style={{ width: '40px' }}>On Duty</span>
              <span style={{ flex: 1 }}>Student Name & Roll No.</span>
            </div>
            {students.map((s, idx) => (
              <div 
                key={s.id} 
                className={`attendance-row ${dutySet.has(s.id) ? 'marked-present' : ''}`}
                onClick={() => toggleDuty(s.id)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <span className="row-number">{idx + 1}</span>
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={dutySet.has(s.id)} 
                    onChange={() => {}} // Handle via row click
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
                <span className="row-name" style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>
                  {s.name} <span style={{ color: '#0056b3', marginLeft: '6px', fontSize: '0.9em' }}>[{s.roll_number}]</span>
                </span>
                <span className={`row-status ${dutySet.has(s.id) ? 'present' : ''}`}>
                  {dutySet.has(s.id) ? 'ON DUTY' : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
