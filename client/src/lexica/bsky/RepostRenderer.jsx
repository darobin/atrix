import React from 'react';
import Timestamp from '../../components/Timestamp.jsx';

export default function RepostRenderer({ event, matrixClient }) {
  const content = typeof event.getContent === 'function' ? event.getContent() : event.content;
  const sender = typeof event.getSender === 'function' ? event.getSender() : event.sender;
  const ts = typeof event.getTs === 'function' ? event.getTs() : event.origin_server_ts;
  const handle = sender?.replace(/^@atproto_/, '').split(':')[0] || sender;

  const relatedEventId = content?.['m.relates_to']?.event_id;

  return (
    <div className="border border-green-200 rounded-xl p-3 bg-green-50">
      <div className="flex items-center gap-1.5 text-xs text-green-700 mb-2">
        <span>🔁</span>
        <span className="font-medium">{handle}</span>
        <span>reposted</span>
        <Timestamp ts={ts} />
      </div>
      {relatedEventId && (
        <div className="text-xs text-gray-500 font-mono truncate">
          ref: {relatedEventId}
        </div>
      )}
    </div>
  );
}
