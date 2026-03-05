import React from 'react';
import Timestamp from '../components/Timestamp.jsx';

export default function PlainMessageRenderer({ event }) {
  const content = typeof event.getContent === 'function' ? event.getContent() : event.content;
  const sender = typeof event.getSender === 'function' ? event.getSender() : event.sender;
  const ts = typeof event.getTs === 'function' ? event.getTs() : event.origin_server_ts;
  const body = content?.body || content?.text || JSON.stringify(content);

  return (
    <div className="flex gap-3 group px-2 py-1 rounded hover:bg-gray-50">
      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xs text-gray-600 font-medium">
        {(sender || '?')[1]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900">{sender}</span>
          <Timestamp ts={ts} />
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{body}</p>
      </div>
    </div>
  );
}
