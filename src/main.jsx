import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  MessageSquarePlus,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import './styles.css';

function normalizeApiUrl(value) {
  if (!value) return '/api';
  const cleanValue = value.replace(/\/+$/, '');
  return cleanValue.endsWith('/api') ? cleanValue : `${cleanValue}/api`;
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
const LOCAL_API_URL = 'http://localhost:5002/api';
const statuses = ['new', 'contacted', 'converted'];
const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted'
};

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('API server se JSON response nahi mila. Backend running hai ya VITE_API_URL check karo.');
  }

  return response.json();
}

async function apiRequest(path, options = {}) {
  const bases = API_URL === LOCAL_API_URL ? [API_URL] : [API_URL, LOCAL_API_URL];
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, options);
      const data = await readJson(response);
      return { response, data };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('mini-crm-token') || '');
  const [admin, setAdmin] = useState(() => localStorage.getItem('mini-crm-admin') || '');

  function handleLogin(nextToken, nextAdmin) {
    localStorage.setItem('mini-crm-token', nextToken);
    localStorage.setItem('mini-crm-admin', nextAdmin.email);
    setToken(nextToken);
    setAdmin(nextAdmin.email);
  }

  function logout() {
    localStorage.removeItem('mini-crm-token');
    localStorage.removeItem('mini-crm-admin');
    setToken('');
    setAdmin('');
  }

  return token ? (
    <Dashboard token={token} admin={admin} onLogout={logout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: 'admin@minicrm.local', password: 'admin12345' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { response, data } = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLogin(data.token, data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <ShieldCheck size={30} />
        </div>
        <h1>Mini CRM Admin</h1>
        <p>Secure lead control for website enquiries, follow-ups, and conversions.</p>
        <form onSubmit={submit} className="login-form">
          <label>
            Admin email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ token, admin, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, new: 0, contacted: 0, converted: 0, conversionRate: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead._id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, search]);

  useEffect(() => {
    if (selectedLead?._id) {
      setSelectedLeadId(selectedLead._id);
    }
  }, [selectedLead?._id]);

  async function fetchLeads() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());

    try {
      const { response, data } = await apiRequest(`/leads?${params}`, {
        headers: authHeaders(token)
      });

      if (!response.ok) {
        throw new Error(data.message || 'Could not load leads');
      }

      setLeads(data.leads);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(leadId, status) {
    const { response } = await apiRequest(`/leads/${leadId}/status`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      await fetchLeads();
    }
  }

  async function addNote(event) {
    event.preventDefault();
    if (!selectedLead || !noteText.trim()) return;

    const { response } = await apiRequest(`/leads/${selectedLead._id}/notes`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ text: noteText })
    });

    if (response.ok) {
      setNoteText('');
      await fetchLeads();
    }
  }

  async function removeLead(leadId) {
    const { response } = await apiRequest(`/leads/${leadId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });

    if (response.ok) {
      setSelectedLeadId('');
      await fetchLeads();
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-row">
            <ShieldCheck size={28} />
            <span>Mini CRM</span>
          </div>
          <nav>
            <a className="active" href="#leads">
              <UsersRound size={18} /> Leads
            </a>
            <a href="#analytics">
              <BarChart3 size={18} /> Analytics
            </a>
          </nav>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          <LogOut size={18} /> Log out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{admin}</p>
            <h1>Lead Management</h1>
          </div>
          <button className="primary-action" onClick={seedLead}>
            <MessageSquarePlus size={18} /> Add sample lead
          </button>
        </header>

        <section id="analytics" className="metric-grid">
          <Metric icon={<UsersRound />} label="Total leads" value={analytics.total} />
          <Metric icon={<Clock3 />} label="New" value={analytics.new} />
          <Metric icon={<UserRoundCheck />} label="Contacted" value={analytics.contacted} />
          <Metric icon={<CheckCircle2 />} label="Conversion" value={`${analytics.conversionRate}%`} />
        </section>

        <section id="leads" className="content-grid">
          <div className="lead-list-panel">
            <div className="toolbar">
              <div className="search-field">
                <Search size={18} />
                <input
                  placeholder="Search name, email, source"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="error">{error}</p>}
            {loading ? (
              <p className="empty-state">Loading leads...</p>
            ) : leads.length ? (
              <div className="lead-list">
                {leads.map((lead) => (
                  <button
                    type="button"
                    key={lead._id}
                    className={`lead-row ${selectedLead?._id === lead._id ? 'selected' : ''}`}
                    onClick={() => setSelectedLeadId(lead._id)}
                  >
                    <span>
                      <strong>{lead.name}</strong>
                      <small>{lead.email}</small>
                    </span>
                    <span className={`status-pill ${lead.status}`}>{statusLabels[lead.status]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No leads match your filters.</p>
            )}
          </div>

          <LeadDetail
            lead={selectedLead}
            noteText={noteText}
            setNoteText={setNoteText}
            onStatusChange={updateStatus}
            onAddNote={addNote}
            onDelete={removeLead}
          />
        </section>
      </section>
    </main>
  );

  async function seedLead() {
    await apiRequest('/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nisha Kapoor',
        email: `lead${Date.now()}@example.com`,
        phone: '+91 98765 43210',
        source: 'Website contact form',
        message: 'Interested in a monthly website maintenance package.'
      })
    });
    await fetchLeads();
  }
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      <span>{React.cloneElement(icon, { size: 22 })}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function LeadDetail({ lead, noteText, setNoteText, onStatusChange, onAddNote, onDelete }) {
  if (!lead) {
    return <section className="detail-panel empty-state">Select a lead to manage follow-ups.</section>;
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{lead.name}</h2>
          <p>{lead.source}</p>
        </div>
        <button className="icon-button danger" title="Delete lead" onClick={() => onDelete(lead._id)}>
          <Trash2 size={18} />
        </button>
      </div>

      <div className="contact-strip">
        <span>
          <Mail size={17} /> {lead.email}
        </span>
        {lead.phone && (
          <span>
            <Phone size={17} /> {lead.phone}
          </span>
        )}
      </div>

      {lead.message && <p className="message-box">{lead.message}</p>}

      <div className="status-control">
        {statuses.map((status) => (
          <button
            key={status}
            className={lead.status === status ? 'active' : ''}
            onClick={() => onStatusChange(lead._id, status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      <form className="note-form" onSubmit={onAddNote}>
        <textarea
          placeholder="Add a follow-up note"
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
        />
        <button type="submit">
          <MessageSquarePlus size={18} /> Save note
        </button>
      </form>

      <div className="notes-list">
        <h3>Follow-up notes</h3>
        {lead.notes?.length ? (
          [...lead.notes].reverse().map((note) => (
            <article key={note._id} className="note">
              <p>{note.text}</p>
              <small>
                {note.author} · {new Date(note.createdAt).toLocaleString()}
              </small>
            </article>
          ))
        ) : (
          <p className="empty-state">No notes yet.</p>
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
