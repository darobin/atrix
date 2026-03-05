import React from 'react';

export default function Timestamp({ ts }) {
  if (!ts) return null;
  const date = new Date(ts);
  const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const full = date.toLocaleString();
  return (
    <time dateTime={date.toISOString()} title={full} className="text-xs text-gray-400">
      {label}
    </time>
  );
}
