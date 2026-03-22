import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectAccessToken, selectIsAuthenticated } from '../features/auth/authSlice';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socketClient';
import { apiSlice } from '../app/api';

export default function useSocket() {
  const token = useSelector(selectAccessToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (connectedRef.current) {
        disconnectSocket();
        connectedRef.current = false;
      }
      return;
    }

    const socket = connectSocket(token);
    connectedRef.current = true;

    // Invalidate notifications tag when a new notification arrives
    socket.on('notification', () => {
      dispatch(apiSlice.util.invalidateTags(['Notification']));
    });

    socket.on('order_status_update', () => {
      dispatch(apiSlice.util.invalidateTags(['Order']));
    });

    return () => {
      socket.off('notification');
      socket.off('order_status_update');
    };
  }, [isAuthenticated, token, dispatch]);

  return { socket: getSocket() };
}
