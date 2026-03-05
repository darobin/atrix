import React from 'react';
import Avatar from '../../components/Avatar.jsx';
import Timestamp from '../../components/Timestamp.jsx';

function countReactions(reactions, key) {
  return reactions.filter(e => {
    const rel = (typeof e.getContent === 'function' ? e.getContent() : e.content)?.['m.relates_to'];
    return rel?.key === key;
  }).length;
}

export default function PostRenderer({ event, reactions = [], matrixClient, roomConfig }) {
  const content = typeof event.getContent === 'function' ? event.getContent() : event.content;
  const sender = typeof event.getSender === 'function' ? event.getSender() : event.sender;
  const ts = typeof event.getTs === 'function' ? event.getTs() : event.origin_server_ts;
  const eventId = typeof event.getId === 'function' ? event.getId() : event.event_id;

  const text = content?.text || content?.['$text'] || '';
  const likeCount = countReactions(reactions, '❤️');
  const repostCount = countReactions(reactions, '🔁');

  // Extract handle from MXID: @atproto_...:server → use displayname or fallback
  const handle = sender?.replace(/^@atproto_/, '').split(':')[0] || sender;

  async function handleLike() {
    if (!matrixClient) return;
    const roomId = typeof event.getRoomId === 'function' ? event.getRoomId() : event.room_id;
    await matrixClient.sendEvent(roomId, 'm.reaction', {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: eventId,
        key: '❤️',
      },
    });
  }

  async function handleRepost() {
    if (!matrixClient) return;
    const roomId = typeof event.getRoomId === 'function' ? event.getRoomId() : event.room_id;
    await matrixClient.sendEvent(roomId, 'io.atrix.lexicon.event', {
      '$type': 'app.bsky.feed.repost',
      'createdAt': new Date().toISOString(),
      'm.relates_to': {
        rel_type: 'm.reference',
        event_id: eventId,
      },
    });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:bg-gray-50 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar handle={handle} size={10} />
        <div>
          <div className="font-semibold text-gray-900 text-sm leading-tight">{handle}</div>
          <div className="text-gray-500 text-xs">@{handle}</div>
        </div>
        <div className="ml-auto">
          <Timestamp ts={ts} />
        </div>
      </div>

      {/* Post text */}
      <div className="text-gray-900 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
        {text}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 text-gray-500">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 text-xs hover:text-red-500 transition-colors group"
        >
          <span className="text-base group-hover:scale-110 transition-transform">❤️</span>
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          onClick={handleRepost}
          className="flex items-center gap-1.5 text-xs hover:text-green-500 transition-colors group"
        >
          <span className="text-base group-hover:scale-110 transition-transform">🔁</span>
          {repostCount > 0 && <span>{repostCount}</span>}
        </button>
      </div>
    </div>
  );
}
