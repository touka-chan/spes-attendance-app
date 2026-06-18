"use client";
import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../lib/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ firstname: '', middlename: '', lastname: '', suffix: '', email: '' });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = () => {
    getEmployees().then(setEmployees).catch(() => {});
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ firstname: '', middlename: '', lastname: '', suffix: '', email: '' });
    setShowForm(true);
  };

  const openEdit = (emp) => {
    setEditId(emp.id);
    setForm({ firstname: emp.firstname, middlename: emp.middlename || '', lastname: emp.lastname, suffix: emp.suffix || '', email: emp.email });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await updateEmployee(editId, form);
      } else {
        await createEmployee(form);
      }
      setShowForm(false);
      fetchEmployees();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await deleteEmployee(id);
      fetchEmployees();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <>
      <div className={styles.overviewHeader}>
        <div>
          <h3>Employee Management</h3>
          <p>Manage all employees and their records</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={openAdd}>
            <span className="material-symbols-outlined">person_add</span>
            Add Employee
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12, padding: 32, width: 480,
            maxHeight: '90vh', overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editId ? 'Edit Employee' : 'Add Employee'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>FIRST NAME</label>
                <input value={form.firstname} onChange={e => setForm({...form, firstname: e.target.value})}
                  className={styles.timeInput} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>MIDDLE NAME</label>
                <input value={form.middlename} onChange={e => setForm({...form, middlename: e.target.value})}
                  className={styles.timeInput} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>LAST NAME</label>
                <input value={form.lastname} onChange={e => setForm({...form, lastname: e.target.value})}
                  className={styles.timeInput} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>SUFFIX</label>
                <input value={form.suffix} onChange={e => setForm({...form, suffix: e.target.value})}
                  className={styles.timeInput} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>EMAIL</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className={styles.timeInput} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className={styles.btnSecondary} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleSave}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.scheduleCard} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.id_no}</td>
                  <td style={{ fontWeight: 600 }}>{emp.firstname} {emp.lastname}</td>
                  <td>{emp.email}</td>
                  <td>
                    <button onClick={() => openEdit(emp)} className={styles.iconBtn} title="Edit">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className={styles.iconBtn} title="Delete">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary)' }}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
