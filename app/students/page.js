'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

const HOSTELS = [
  'Ambika girls hostel',
  'Kailash boys hostel',
  'Himadri boys hostel',
  'Satpura girls hostel',
  'Manimahesh girls hostel',
  'Dauladhar boys hostel',
  'Neelkanth boys hostel',
  'Himgiri boys hostel',
  'Vindhyachal boys hostel',
  'Parvati girls hostel'
];

const GENDERS = ['Male', 'Female', 'Other'];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState('');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newHostel, setNewHostel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editHostel, setEditHostel] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newGender || !newHostel) {
      showMessage('error', 'Please fill all fields.');
      return;
    }
    try {
      await api.post('/students', { name: newName.trim(), roll_number: newRollNumber.trim(), gender: newGender, hostel: newHostel });
      setNewName('');
      setNewRollNumber('');
      setNewGender('');
      setNewHostel('');
      fetchStudents();
      showMessage('success', 'Student added successfully!');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to add student.');
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim() || !editGender || !editHostel) {
      showMessage('error', 'Please fill all fields.');
      return;
    }
    try {
      await api.put(`/students/${id}`, { name: editName.trim(), roll_number: editRollNumber.trim(), gender: editGender, hostel: editHostel });
      setEditingId(null);
      setEditName('');
      setEditRollNumber('');
      setEditGender('');
      setEditHostel('');
      fetchStudents();
      showMessage('success', 'Student updated successfully!');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update student.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
      showMessage('success', 'Student deleted.');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to delete student.');
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditRollNumber(student.roll_number || '');
    setEditGender(student.gender || '');
    setEditHostel(student.hostel || '');
  };

  return (
    <PageWrapper>
      <div className="students-page">
        <div className="page-header">
          <div>
            <h1>Student Management</h1>
            <p className="subtitle">Add, edit, or remove students from your section</p>
          </div>
          <div className="student-count-badge">
            {students.length} Student{students.length !== 1 ? 's' : ''}
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleAdd} className="add-student-form glass-card">
          <h2>➕ Add New Student</h2>
          <div className="add-student-row">
            <input
              type="text"
              placeholder="Student Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              style={{ flex: 1.5 }}
            />
            <input
              type="text"
              placeholder="Roll No."
              value={newRollNumber}
              onChange={(e) => setNewRollNumber(e.target.value)}
              maxLength={20}
              style={{ flex: 1 }}
            />
            <select value={newGender} onChange={(e) => setNewGender(e.target.value)} required style={{ flex: 1 }}>
              <option value="">Select Gender</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={newHostel} onChange={(e) => setNewHostel(e.target.value)} required>
              <option value="">Select Hostel</option>
              {HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <button type="submit" className="btn btn-primary">Add Student</button>
          </div>
        </form>

        {loading ? (
          <div className="loading-state"><span className="spinner"></span> Loading students...</div>
        ) : students.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">👥</div>
            <h3>No students yet</h3>
            <p>Add your first student using the form above</p>
          </div>
        ) : (
          <div className="students-list">
            {students.map((student, index) => (
              <div key={student.id} className="student-card glass-card">
                <span className="student-number">{index + 1}</span>
                {editingId === student.id ? (
                  <div className="student-edit-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      placeholder="Name"
                      style={{ flex: 1.5, minWidth: '100px' }}
                    />
                    <input
                      type="text"
                      value={editRollNumber}
                      onChange={(e) => setEditRollNumber(e.target.value)}
                      placeholder="Roll No."
                      style={{ flex: 1, minWidth: '80px', marginLeft: '5px' }}
                    />
                    <select value={editGender} onChange={(e) => setEditGender(e.target.value)} style={{ marginLeft: '5px', flex: 1 }}>
                      <option value="">Select Gender</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={editHostel} onChange={(e) => setEditHostel(e.target.value)} style={{ marginLeft: '10px', marginRight: '10px' }}>
                      <option value="">Select Hostel</option>
                      {HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(student.id)}>Save</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="student-info" style={{ flex: 1, paddingLeft: '1rem', textAlign: 'left' }}>
                      <div className="student-name">
                        {student.name} {student.roll_number && <span style={{ color: '#0056b3', marginLeft: '8px', fontSize: '0.9em' }}>[{student.roll_number}]</span>}
                      </div>
                      <div className="student-meta" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                        {student.gender ? `${student.gender} | ${student.hostel}` : 'No details'}
                      </div>
                    </div>
                    <div className="student-actions">
                      <button className="btn-icon btn-edit" onClick={() => startEdit(student)} title="Edit">✏️</button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(student.id, student.name)} title="Delete">🗑️</button>
                    </div>
                  </>
                    )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
