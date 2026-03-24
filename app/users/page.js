'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageWrapper from '@/components/PageWrapper';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      showMessage('error', 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenForm = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({ name: user.name, email: user.email, password: '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', password: '' });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', email: '', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showMessage('error', 'Name and email are required.');
      return;
    }
    if (!editingId && !formData.password.trim()) {
      showMessage('error', 'Password is required for new users.');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, formData);
        showMessage('success', 'User updated successfully!');
      } else {
        await api.post('/users', formData);
        showMessage('success', 'User created successfully!');
      }
      handleCloseForm();
      fetchUsers();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to save user.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`WARNING: Deleting user "${name}" will also delete all their students and attendance records. Are you sure you want to proceed?`)) {
      return;
    }
    
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      showMessage('success', 'User deleted successfully.');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleViewData = (user) => {
    localStorage.setItem('targetUser', JSON.stringify({ id: user.id, name: user.name }));
    window.location.href = '/'; 
  };

  return (
    <PageWrapper>
      <div className="users-page">
        <div className="page-header">
          <div>
            <h1>User Management</h1>
            <p className="subtitle">Manage instructor accounts (Admin only)</p>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenForm()}>
            ➕ Create New User
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        {showForm && (
          <div className="glass-card mb-4" style={{ marginBottom: '24px' }}>
            <h2>{editingId ? 'Edit User' : 'Create New User'}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="Instructor Name"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  placeholder="user@nimbus.com"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password {editingId && '(Leave blank to keep current)'}</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  placeholder="••••••••"
                  required={!editingId}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary">Save User</button>
                <button type="button" className="btn btn-outline" onClick={handleCloseForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state"><span className="spinner"></span> Loading users...</div>
        ) : users.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">👥</div>
            <h3>No regular users found</h3>
            <p>Create a user account to get started.</p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>{u.name}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => handleViewData(u)} title="View/Edit Data" style={{ color: 'var(--accent)' }}>👁️</button>
                        <button className="btn-icon btn-edit" onClick={() => handleOpenForm(u)} title="Edit">✏️</button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(u.id, u.name)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
