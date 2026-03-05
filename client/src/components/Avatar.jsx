import React from 'react';

export default function Avatar({ handle, avatarUrl, size = 8 }) {
  const initials = handle
    ? handle.replace(/^@/, '').slice(0, 2).toUpperCase()
    : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={handle}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-medium`}
      style={{ fontSize: size <= 8 ? 12 : 14 }}
    >
      {initials}
    </div>
  );
}
