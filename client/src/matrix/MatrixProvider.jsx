import React, { createContext, useContext, useEffect, useState } from 'react';
import { createMatrixClient, destroyMatrixClient } from './matrixClient.js';
import { useAuth } from '../auth/AuthProvider.jsx';

const MatrixContext = createContext(null);

export function MatrixProvider({ children }) {
  const { user } = useAuth();
  const [matrixClient, setMatrixClient] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user?.mxid || !user?.matrixAccessToken) return;

    const client = createMatrixClient({
      mxid: user.mxid,
      accessToken: user.matrixAccessToken,
      homeserverUrl: window.location.origin,
    });

    client.on('sync', (state) => {
      if (state === 'PREPARED') {
        setSyncing(false);
        setRooms(client.getRooms());
      }
    });

    client.on('Room', () => {
      setRooms(client.getRooms());
    });

    client.on('Room.name', () => {
      setRooms([...client.getRooms()]);
    });

    setSyncing(true);
    client.startClient({ initialSyncLimit: 20 });
    setMatrixClient(client);

    return () => {
      destroyMatrixClient();
      setMatrixClient(null);
      setRooms([]);
    };
  }, [user?.mxid, user?.matrixAccessToken]);

  return (
    <MatrixContext.Provider value={{ matrixClient, rooms, syncing }}>
      {children}
    </MatrixContext.Provider>
  );
}

export function useMatrix() {
  const ctx = useContext(MatrixContext);
  if (!ctx) throw new Error('useMatrix must be used within MatrixProvider');
  return ctx;
}
