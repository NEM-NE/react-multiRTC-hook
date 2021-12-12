import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (url, namespace) => {
  const socket = useRef();

  useEffect(() => {
    socket.current = io(url + namespace);

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = undefined;
      }
    };
  }, []);

  return socket.current;
};

export default useSocket;
