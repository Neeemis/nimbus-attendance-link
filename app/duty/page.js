'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

export default function DutyRoasterPage() {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dutySet, setDutySet] = useState(new Set());
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'duty', 'off'

  // Span PDF Export Modal
  const [showSpanModal, setShowSpanModal] = useState(false);
  const [spanStart, setSpanStart] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [spanEnd, setSpanEnd] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

  useEffect(() => {
    if (date) fetchDutyList();
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
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load discipline duty roster.' });
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
      setMessage({ type: 'success', text: `Discipline duty roaster for ${date} updated successfully!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Save failed.' });
    }
  };

  const changeDateBy = (offsetDays) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  };

  const exportDayPDF = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/duty/report/pdf?date=${date}&token=${token}`, '_blank');
  };

  const handleExportSpanPDF = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    window.open(`/api/duty/report/pdf?startDate=${spanStart}&endDate=${spanEnd}&token=${token}`, '_blank');
    setShowSpanModal(false);
  };

  const filteredStudents = students.filter(s => {
    if (filterMode === 'duty') return dutySet.has(s.id);
    if (filterMode === 'off') return !dutySet.has(s.id);
    return true;
  });

  const onDutyCount = dutySet.size;
  const offDutyCount = students.length - onDutyCount;

  return (
    <PageWrapper>
      <div className="attendance-page fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>📋 Discipline Duty Roaster</h1>
            <p className="subtitle">View and assign duties to Discipline Club members for any day</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-accent shine-effect" onClick={exportDayPDF} title="Download on-duty PDF for this selected date">
              📄 Export Day PDF
            </button>
            <button className="btn btn-outline" onClick={() => setShowSpanModal(true)} title="Select a span of dates and export Duty PDF">
              📅 Export Span PDF
            </button>
          </div>
        </div>

        {/* Date Selector and Navigation Controls */}
        <div className="attendance-controls glass-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="date-picker-group" style={{ marginBottom: 0 }}>
              <label htmlFor="duty-day-picker" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#94a3b8' }}>📅 Selected Date:</label>
              <input 
                id="duty-day-picker"
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(15, 23, 42, 0.6)', color: '#fff', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-sm btn-outline" onClick={() => changeDateBy(-1)} title="Previous Day">
                ◀ Prev
              </button>
              <button className="btn btn-sm btn-outline" onClick={setToday} title="Jump to Today">
                Today
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => changeDateBy(1)} title="Next Day">
                Next ▶
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary shine-effect" onClick={saveDuty}>
              💾 Save Duty List
            </button>
            <button className="btn btn-outline" onClick={() => {
              const allIds = students.map(s => s.id);
              if (dutySet.size === students.length) setDutySet(new Set());
              else setDutySet(new Set(allIds));
            }}>
              {dutySet.size === students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Filter Badges / Summary */}
        <div style={{ display: 'flex', gap: '10px', margin: '16px 0', flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterMode('all')}
          >
            👥 All Members ({students.length})
          </button>
          <button 
            className={`btn btn-sm ${filterMode === 'duty' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterMode('duty')}
            style={{ borderColor: filterMode === 'duty' ? undefined : '#22c55e', color: filterMode === 'duty' ? undefined : '#22c55e' }}
          >
            ✅ On Duty ({onDutyCount})
          </button>
          <button 
            className={`btn btn-sm ${filterMode === 'off' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterMode('off')}
          >
            ⏸️ Off Duty ({offDutyCount})
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ margin: '16px 0' }}>{message.text}</div>
        )}

        {loading ? (
          <div className="loading-state"><span className="spinner"></span> Loading duty roster...</div>
        ) : (
          <div className="student-attendance-list glass-card">
            <div className="attendance-header" style={{ padding: '12px 20px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '40px' }}>#</span>
              <span style={{ width: '40px' }}>Duty</span>
              <span style={{ flex: 1 }}>Student Name & Roll No.</span>
              <span style={{ width: '120px', textAlign: 'center' }}>Status</span>
            </div>
            {filteredStudents.length === 0 ? (
              <p style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                {filterMode === 'duty' ? 'No students are marked on duty for this date.' : 'No Discipline Club members found.'}
              </p>
            ) : (
              filteredStudents.map((s, idx) => {
                const isOnDuty = dutySet.has(s.id);
                return (
                  <div 
                    key={s.id} 
                    className={`attendance-row ${isOnDuty ? 'marked-present' : ''}`}
                    onClick={() => toggleDuty(s.id)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="row-number">{idx + 1}</span>
                    <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isOnDuty} 
                        readOnly
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                    <span className="row-name" style={{ flex: 1, textAlign: 'left', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{s.name}</span>
                      <span style={{ color: '#38bdf8', fontSize: '0.9em' }}>[{s.roll_number || 'N/A'}]</span>
                      {s.extension_cancelled && (
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
                    <span style={{ width: '120px', textAlign: 'center' }}>
                      <span className={`row-status ${isOnDuty ? 'present' : ''}`} style={{ display: 'inline-block', minWidth: '85px', textAlign: 'center' }}>
                        {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 📅 Modal: Export Span Duty PDF */}
        {showSpanModal && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(10, 10, 20, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div className="glass-card" style={{ width: '90%', maxWidth: '440px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#38bdf8' }}>📅 Export Duty Roster Span</h2>
                <button 
                  onClick={() => setShowSpanModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
                Select a start and end date to generate a combined PDF of all Discipline Club duty deployments across the span.
              </p>

              <form onSubmit={handleExportSpanPDF} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Start Date:</label>
                  <input 
                    type="date" 
                    value={spanStart} 
                    onChange={e => setSpanStart(e.target.value)}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(15, 23, 42, 0.7)', color: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>End Date:</label>
                  <input 
                    type="date" 
                    value={spanEnd} 
                    onChange={e => setSpanEnd(e.target.value)}
                    required
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(15, 23, 42, 0.7)', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary shine-effect" style={{ flex: 1 }}>
                    📄 Download PDF
                  </button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSpanModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
