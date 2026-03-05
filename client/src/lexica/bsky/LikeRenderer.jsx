import React from 'react';
import Timestamp from '../../components/Timestamp.jsx';

export default function LikeRenderer({ event }) {
  const sender = typeof event.getSender === 'function' ? event.getSender() : event.sender;
  const ts = typeof event.getTs === 'function' ? event.getTs() : event.origin_server_ts;
  const handle = sender?.replace(/^@atproto_/, '').split(':')[0] || sender;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 px-2 py-1">
      <span>❤️</span>
      <span className="font-medium text-gray-700">{handle}</span>
      <span>liked this</span>
      <Timestamp ts={ts} />
    </div>
  );
}
