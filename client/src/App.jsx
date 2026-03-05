import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx';
import { MatrixProvider } from './matrix/MatrixProvider.jsx';
import LoginPage from './auth/LoginPage.jsx';
import RoomList from './rooms/RoomList.jsx';
import RoomView from './rooms/RoomView.jsx';
import RoomCreator from './rooms/RoomCreator.jsx';

function UserProfile({ user, onLogout }) {
  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(user.handle || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {user.displayName && (
            <div className="font-semibold text-white text-sm truncate leading-tight">{user.displayName}</div>
          )}
          <div className="text-gray-400 text-xs truncate">@{user.handle}</div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="text-gray-500 hover:text-gray-300 text-xs flex-shrink-0"
        >
          ⏏
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showCreator, setShowCreator] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MatrixProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-72 bg-gray-900 text-white flex flex-col">
          <UserProfile user={user} onLogout={logout} />
          <div className="flex-1 overflow-y-auto">
            <RoomList
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
          </div>
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => setShowCreator(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-sm"
            >
              + New Room
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {selectedRoomId ? (
            <RoomView roomId={selectedRoomId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a room or create a new one
            </div>
          )}
        </div>
      </div>

      {showCreator && (
        <RoomCreator
          onClose={() => setShowCreator(false)}
          onCreated={(room) => {
            setShowCreator(false);
            setSelectedRoomId(room.room_id);
          }}
        />
      )}
    </MatrixProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
