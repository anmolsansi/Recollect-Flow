import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import type { ItemResponse } from '@recollect/contracts';
import { fetchApi, loginAdmin, logoutAdmin } from './api';
import './index.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');

  // Assume user is authenticated if they have the HttpOnly cookie.
  // In a real app we might fetch `/api/v1/auth/me` to check.
  // We'll just let API calls fail if they don't have the session cookie, and then handle the error.

  if (!isAuth) {
    return (
      <div
        className="app-container"
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <div
          className="card fade-in"
          style={{ width: '400px', maxWidth: '90%' }}
        >
          <h2 style={{ marginBottom: '1rem' }}>Admin Access</h2>
          {error && (
            <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              loginAdmin(inputToken)
                .then(() => {
                  setIsAuth(true);
                })
                .catch((err) => {
                  setError(err.message);
                });
            }}
          >
            <input
              type="password"
              className="input"
              placeholder="Enter ADMIN_TOKEN"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Inbox() {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Inbox' | 'Actionable'>('All');

  useEffect(() => {
    let url = '/items';
    if (filter === 'Inbox') url = '/items?lifecycleStatus=Inbox';
    if (filter === 'Actionable') url = '/items?lifecycleStatus=Actioned'; // Wait, should be 'Actioned' maybe? Let's just fetch all and filter in memory for now, or just send query params.

    fetchApi(url)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [filter]);

  const filteredItems = items.filter((i) => {
    if (filter === 'Inbox') return i.lifecycle_status === 'Inbox';
    if (filter === 'Actionable')
      return (
        i.lifecycle_status === 'Actioned' || i.lifecycle_status === 'Actionable'
      );
    return true;
  });

  return (
    <div className="main-content fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1>Inbox</h1>
        <button
          className="btn"
          onClick={() => {
            logoutAdmin().then(() => window.location.reload());
          }}
        >
          Logout
        </button>
      </div>

      <div className="inbox-filters">
        <button
          className={`filter-chip ${filter === 'All' ? 'active' : ''}`}
          onClick={() => setFilter('All')}
        >
          All
        </button>
        <button
          className={`filter-chip ${filter === 'Inbox' ? 'active' : ''}`}
          onClick={() => setFilter('Inbox')}
        >
          Needs Review
        </button>
        <button
          className={`filter-chip ${filter === 'Actionable' ? 'active' : ''}`}
          onClick={() => setFilter('Actionable')}
        >
          Actionable
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="inbox-grid">
          {filteredItems.map((item) => {
            const badgeClass =
              item.lifecycle_status?.toLowerCase() === 'inbox'
                ? 'badge-inbox'
                : item.lifecycle_status?.toLowerCase() === 'reviewed'
                  ? 'badge-reviewed'
                  : item.lifecycle_status?.toLowerCase() === 'actioned'
                    ? 'badge-actioned'
                    : item.lifecycle_status?.toLowerCase() === 'archived'
                      ? 'badge-archived'
                      : '';
            return (
              <Link
                to={`/items/${item.id}`}
                key={item.id}
                className="card hover-lift"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span className={`badge ${badgeClass}`}>
                    {item.lifecycle_status || 'UNCLASSIFIED'}
                  </span>
                  <span
                    style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}
                  >
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : 'Unknown Date'}
                  </span>
                </div>
                <h3 style={{ margin: '0.5rem 0', flex: 1 }}>
                  {item.title || 'Untitled'}
                </h3>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.summary ||
                    item.raw_text?.substring(0, 100) ||
                    'No summary'}
                </p>
                {item.privacy_level === 'sensitive' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <span className="badge badge-sensitive">Sensitive</span>
                  </div>
                )}
              </Link>
            );
          })}
          {filteredItems.length === 0 && <p>No items found.</p>}
        </div>
      )}
    </div>
  );
}

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi(`/items/${id}`)
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const saveItem = async () => {
    setSaving(true);
    setError(null);
    try {
      await fetchApi(`/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: item?.title,
          summary: item?.summary,
          lifecycle_status: item?.lifecycle_status,
          privacy_level: item?.privacy_level,
          importance: item?.importance
            ? parseInt(item.importance as unknown as string)
            : 0,
          project: item?.project,
        }),
      });
      alert('Saved!');
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="main-content fade-in">
        <p>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className="main-content fade-in">
        <p style={{ color: 'var(--danger-color)' }}>Error: {error}</p>
      </div>
    );
  if (!item)
    return (
      <div className="main-content fade-in">
        <p>Not found</p>
      </div>
    );

  return (
    <div className="main-content fade-in">
      <button
        className="btn btn-outline"
        onClick={() => navigate('/')}
        style={{ marginBottom: '1.5rem' }}
      >
        &larr; Back to Inbox
      </button>

      <div className="card glass">
        <h2 style={{ marginBottom: '1.5rem' }}>Edit Item</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Lifecycle Status
            </label>
            <select
              className="input"
              value={item.lifecycle_status || ''}
              onChange={(e) =>
                setItem({ ...item, lifecycle_status: e.target.value })
              }
            >
              <option value="Inbox">Inbox</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Actioned">Actioned</option>
              <option value="Archived">Archived</option>
              <option value="Duplicate">Duplicate</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Privacy Level
            </label>
            <select
              className="input"
              value={item.privacy_level || 'unknown'}
              onChange={(e) =>
                setItem({ ...item, privacy_level: e.target.value })
              }
            >
              <option value="public">Public</option>
              <option value="personal">Personal</option>
              <option value="sensitive">Sensitive</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Title
            </label>
            <input
              className="input"
              value={item.title || ''}
              onChange={(e) => setItem({ ...item, title: e.target.value })}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Project
            </label>
            <input
              className="input"
              value={item.project || ''}
              onChange={(e) => setItem({ ...item, project: e.target.value })}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Summary
            </label>
            <textarea
              className="input"
              rows={4}
              value={item.summary || ''}
              onChange={(e) => setItem({ ...item, summary: e.target.value })}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Raw Text / Extracted Content (Read Only)
            </label>
            <textarea
              className="input"
              rows={8}
              readOnly
              value={item.raw_text || ''}
              style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
            />
          </div>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-outline"
                style={{
                  color: 'var(--danger-color)',
                  borderColor: 'var(--danger-color)',
                }}
                onClick={async () => {
                  setItem({ ...item, lifecycle_status: 'Deleted' });
                  try {
                    setSaving(true);
                    const res = await fetchApi(`/api/v1/items/${id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        lifecycle_status: 'Deleted',
                        edit_version: item.edit_version,
                      }),
                    });
                    if (!res.ok) throw new Error('Failed to soft delete item');
                    navigate('/');
                  } catch (e: unknown) {
                    setError(
                      e instanceof Error ? e.message : 'An error occurred',
                    );
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                Soft Delete
              </button>
              <button
                className="btn btn-outline"
                style={{
                  color: 'var(--danger-color)',
                  borderColor: 'var(--danger-color)',
                }}
                onClick={async () => {
                  if (
                    confirm(
                      'Are you sure you want to permanently delete this item?',
                    )
                  ) {
                    try {
                      setSaving(true);
                      const res = await fetchApi(`/api/v1/items/${id}`, {
                        method: 'DELETE',
                      });
                      if (!res.ok) throw new Error('Failed to delete item');
                      navigate('/');
                    } catch (e: unknown) {
                      setError(
                        e instanceof Error ? e.message : 'An error occurred',
                      );
                      setSaving(false);
                    }
                  }
                }}
                disabled={saving}
              >
                Hard Delete
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={saveItem}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const logout = async () => {
    try {
      await logoutAdmin();
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      <nav className="navbar glass">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              background:
                'linear-gradient(135deg, var(--primary-color), #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Recollect Flow
          </h2>
        </Link>
        <div>
          <button className="btn btn-outline" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Inbox />} />
        <Route path="/items/:id" element={<ItemDetail />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Layout />
      </AuthGuard>
    </BrowserRouter>
  );
}
