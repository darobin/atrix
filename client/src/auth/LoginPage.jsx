import React, { useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

export default function LoginPage() {
  const { login } = useAuth();
  const [handle, setHandle] = useState(() => getCookie('bsky-handle'));
  const [loading, setLoading] = useState(false);
  const error = new URLSearchParams(window.location.search).get('error');

  function handleSubmit(e) {
    e.preventDefault();
    if (!handle.trim()) return;
    document.cookie = `bsky-handle=${encodeURIComponent(handle.trim())}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
    setLoading(true);
    login(handle.trim());
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Atrix</h1>
        <p className="text-gray-500 text-sm mb-6">
          Matrix chat powered by ATProto identity
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">
            Authentication failed. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bluesky handle or DID
          </label>
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="you.bsky.social"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {loading ? 'Redirecting…' : 'Sign in with Bluesky'}
          </button>
        </form>
      </div>
    </div>
  );
}
