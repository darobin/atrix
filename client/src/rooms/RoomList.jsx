import React, { useEffect, useState } from 'react';
import { useMatrix } from '../matrix/MatrixProvider.jsx';

function lexiconBadge(prefixes) {
  if (!prefixes || prefixes.length === 0) return null;
  const label = prefixes.includes('app.bsky') || prefixes.some(p => p.startsWith('app.bsky'))
    ? 'Bluesky'
    : prefixes[0];
  return (
    <span className="text-xs bg-blue-500 text-white rounded px-1.5 py-0.5 ml-1">
      {label}
    </span>
  );
}

export default function RoomList({ selectedRoomId, onSelectRoom }) {
  const { rooms, syncing } = useMatrix();
  const [roomConfigs, setRoomConfigs] = useState({});

  // Fetch configs for known rooms
  useEffect(() => {
    rooms.forEach(room => {
      if (roomConfigs[room.roomId]) return;
      fetch(`/api/rooms/${encodeURIComponent(room.roomId)}/config`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(cfg => {
          if (cfg) {
            setRoomConfigs(prev => ({ ...prev, [room.roomId]: cfg }));
          }
        })
        .catch(() => {});
    });
  }, [rooms]);

  if (syncing && rooms.length === 0) {
    return <div className="p-4 text-gray-400 text-sm">Syncing…</div>;
  }

  if (rooms.length === 0) {
    return <div className="p-4 text-gray-400 text-sm">No rooms yet</div>;
  }

  return (
    <div className="py-2">
      <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Rooms
      </div>
      {rooms.map(room => {
        const cfg = roomConfigs[room.roomId];
        const isSelected = room.roomId === selectedRoomId;
        return (
          <button
            key={room.roomId}
            onClick={() => onSelectRoom(room.roomId)}
            className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors ${
              isSelected ? 'bg-gray-700' : ''
            }`}
          >
            <span className="text-gray-300 text-sm truncate flex-1">
              # {room.name || room.roomId}
            </span>
            {cfg && lexiconBadge(cfg.lexiconPrefixes)}
          </button>
        );
      })}
    </div>
  );
}
