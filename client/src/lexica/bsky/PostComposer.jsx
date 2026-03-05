import React, { useState } from 'react';

const MAX_LENGTH = 300;

export default function PostComposer({ onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const remaining = MAX_LENGTH - text.length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || remaining < 0) return;
    setSending(true);
    try {
      await onSend({
        type: 'io.atrix.lexicon.event',
        '$type': 'app.bsky.feed.post',
        'text': text.trim(),
        'createdAt': new Date().toISOString(),
        'langs': ['en'],
      });
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          className="w-full px-4 pt-3 pb-2 text-sm resize-none focus:outline-none"
          disabled={sending}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className={`text-xs ${remaining < 0 ? 'text-red-500' : remaining < 20 ? 'text-yellow-500' : 'text-gray-400'}`}>
            {remaining}
          </span>
          <button
            type="submit"
            disabled={sending || !text.trim() || remaining < 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          >
            {sending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
