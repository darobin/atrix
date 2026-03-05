import React, { useEffect, useRef, useState } from 'react';
import { useMatrix } from '../matrix/MatrixProvider.jsx';
import MessageTimeline from './MessageTimeline.jsx';
import LexiconComposer from '../lexica/LexiconComposer.jsx';

function JsonTimeline({ room, matrixClient }) {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  function loadEvents() {
    if (!room) return;
    setEvents([...room.getLiveTimeline().getEvents()]);
  }

  useEffect(() => {
    loadEvents();
    const onTimeline = (event, r) => { if (r?.roomId === room?.roomId) loadEvents(); };
    matrixClient?.on('Room.timeline', onTimeline);
    return () => matrixClient?.off('Room.timeline', onTimeline);
  }, [room, matrixClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-2 bg-gray-950 font-mono text-xs">
      {events.map(event => {
        const raw = event.event ?? { type: event.getType(), content: event.getContent(), sender: event.getSender(), origin_server_ts: event.getTs(), event_id: event.getId() };
        return (
          <div key={event.getId()} className="bg-gray-900 rounded p-3 text-gray-200 whitespace-pre-wrap break-all">
            {JSON.stringify(raw, null, 2)}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default function RoomView({ roomId }) {
  const { matrixClient } = useMatrix();
  const [roomConfig, setRoomConfig] = useState(null);
  const [room, setRoom] = useState(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!matrixClient) return;
    setRoom(matrixClient.getRoom(roomId));

    // Re-check when Matrix syncs new rooms (e.g. freshly created room)
    const onRoom = () => setRoom(matrixClient.getRoom(roomId));
    matrixClient.on('Room', onRoom);
    matrixClient.on('sync', onRoom);
    return () => {
      matrixClient.off('Room', onRoom);
      matrixClient.off('sync', onRoom);
    };
  }, [matrixClient, roomId]);

  useEffect(() => {
    fetch(`/api/rooms/${encodeURIComponent(roomId)}/config`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(cfg => setRoomConfig(cfg || { lexiconPrefixes: [], allowMatrixMessages: true }))
      .catch(() => setRoomConfig({ lexiconPrefixes: [], allowMatrixMessages: true }));
  }, [roomId]);

  async function handleSend(content) {
    if (!matrixClient) return;
    const { type, ...eventContent } = content;
    await matrixClient.sendEvent(roomId, type || 'm.room.message', eventContent);
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Loading room…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <h2 className="font-semibold text-gray-900">#{room.name || roomId}</h2>
        {roomConfig?.lexiconPrefixes?.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
            {roomConfig.lexiconPrefixes.join(', ')}
          </span>
        )}
        <button
          onClick={() => setShowJson(v => !v)}
          className={`ml-auto text-xs rounded px-2 py-0.5 border transition-colors ${showJson ? 'bg-gray-900 text-gray-100 border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
        >
          {showJson ? 'Rendered' : 'JSON'}
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        {showJson
          ? <JsonTimeline room={room} matrixClient={matrixClient} />
          : <MessageTimeline room={room} roomConfig={roomConfig} matrixClient={matrixClient} />
        }
      </div>

      {/* Composer */}
      {roomConfig && (
        <div className="bg-white border-t border-gray-200">
          <LexiconComposer roomConfig={roomConfig} onSend={handleSend} />
        </div>
      )}
    </div>
  );
}
