import React from 'react';
import { registry } from './registry.js';

function MatrixTextComposer({ onSend }) {
  const [text, setTextState] = React.useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await onSend({
      type: 'm.room.message',
      msgtype: 'm.text',
      body: text.trim(),
    });
    setTextState('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <input
        type="text"
        value={text}
        onChange={e => setTextState(e.target.value)}
        placeholder="Send a message…"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm"
      >
        Send
      </button>
    </form>
  );
}

export default function LexiconComposer({ roomConfig, onSend }) {
  const prefixes = roomConfig?.lexiconPrefixes || [];

  // Find a plugin for the first lexicon prefix
  let plugin = null;
  for (const prefix of prefixes) {
    plugin = registry.getByPrefix(prefix);
    if (plugin) break;
  }

  if (plugin) {
    const composerType = plugin.defaultComposerType;
    const Composer = composerType && plugin.composers?.[composerType];
    if (Composer) {
      return <Composer onSend={onSend} roomConfig={roomConfig} />;
    }
  }

  // Fallback or "also allow matrix messages"
  if (!prefixes.length || roomConfig?.allowMatrixMessages) {
    return <MatrixTextComposer onSend={onSend} />;
  }

  return (
    <div className="p-4 text-sm text-gray-400 text-center">
      No composer available for this room's lexicon
    </div>
  );
}
