import React, { useState } from 'react';

const LEXICON_OPTIONS = [
  { label: 'None (Matrix messages only)', value: null },
  { label: 'Bluesky (app.bsky.*)', value: 'app.bsky' },
  { label: 'Custom prefix…', value: 'custom' },
];

export default function RoomCreator({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [lexiconChoice, setLexiconChoice] = useState(null);
  const [customPrefix, setCustomPrefix] = useState('');
  const [allowMatrix, setAllowMatrix] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    let lexiconPrefixes = [];
    if (lexiconChoice === 'custom') {
      if (!customPrefix.trim()) {
        setError('Enter a custom lexicon prefix');
        return;
      }
      lexiconPrefixes = [customPrefix.trim()];
    } else if (lexiconChoice) {
      lexiconPrefixes = [lexiconChoice];
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, topic, lexiconPrefixes, allowMatrixMessages: allowMatrix }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to create room');
      }
      const room = await resp.json();
      onCreated(room);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create a Room</h2>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lexicon</label>
            <select
              value={lexiconChoice || ''}
              onChange={e => setLexiconChoice(e.target.value || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEXICON_OPTIONS.map(opt => (
                <option key={opt.value ?? ''} value={opt.value ?? ''}>{opt.label}</option>
              ))}
            </select>
          </div>

          {lexiconChoice === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom NSID prefix</label>
              <input
                type="text"
                value={customPrefix}
                onChange={e => setCustomPrefix(e.target.value)}
                placeholder="com.example"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {lexiconChoice && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allowMatrix}
                onChange={e => setAllowMatrix(e.target.checked)}
              />
              Also allow native Matrix messages
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm"
            >
              {loading ? 'Creating…' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
