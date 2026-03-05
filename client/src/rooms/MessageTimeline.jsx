import React, { useEffect, useRef, useState } from 'react';
import LexiconRenderer from '../lexica/LexiconRenderer.jsx';

export default function MessageTimeline({ room, roomConfig, matrixClient }) {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  function loadEvents() {
    if (!room) return;
    const tl = room.getLiveTimeline();
    const evts = tl.getEvents().filter(e =>
      e.getType() === 'm.room.message' ||
      e.getType() === 'io.atrix.lexicon.event' ||
      e.getType() === 'm.reaction'
    );
    setEvents([...evts]);
  }

  useEffect(() => {
    loadEvents();

    const onTimeline = (event, r) => {
      if (r?.roomId === room?.roomId) loadEvents();
    };

    matrixClient?.on('Room.timeline', onTimeline);
    return () => matrixClient?.off('Room.timeline', onTimeline);
  }, [room, matrixClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Group reactions by their related event
  const reactions = {};
  const mainEvents = [];

  for (const event of events) {
    if (event.getType() === 'm.reaction') {
      const rel = event.getContent()?.['m.relates_to'];
      if (rel?.rel_type === 'm.annotation' && rel.event_id) {
        if (!reactions[rel.event_id]) reactions[rel.event_id] = [];
        reactions[rel.event_id].push(event);
        continue;
      }
    }
    mainEvents.push(event);
  }

  if (mainEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No messages yet
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-2">
      {mainEvents.map(event => (
        <LexiconRenderer
          key={event.getId()}
          event={event}
          roomConfig={roomConfig}
          reactions={reactions[event.getId()] || []}
          matrixClient={matrixClient}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
