import {
    useCallback, useRef, useEffect, useState,
  } from 'react';
  import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
  
  import useSocket from 'src/reactSocketHook';
  
  export const useLocalStream = () => {
    const myStreamRef = useRef(null);
    const myVideoRef = useRef(null);
  
    const getLocalStream = useCallback(async () => {
      myStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (myVideoRef.current) myVideoRef.current.srcObject = myStreamRef.current;
        myStreamRef.current
          .getAudioTracks()
          .forEach((track) => (track.enabled = !track.enabled));
    }, []);
  
    return [myStreamRef, myVideoRef, getLocalStream];
  };
  
  export const useSetPeerConnection = ( setParticipants, myStreamRef ) => {
    const peerConnectionConfig = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    };
  
    const handleIceEvent = ({ candidate }, payload) => {
      if (!(payload.socket && candidate)) return;
      payload.socket.emit(roomSocketMessage.ice, candidate, payload.socketId);
    };
  
    const handleTrackEvent = (data, payload) => {
      setParticipants((oldParticipants) => oldParticipants
        .filter((participant) => (participant.userDocumentId !== payload.userDocumentId))
        .concat({
          stream: data.streams[0],
          userDocumentId: payload.userDocumentId,
          mic: payload.mic,
          socketId: payload.socketId,
          isAnonymous: payload.isAnonymous,
        }));
    };
  
    const setPeerConnection = useCallback((participant, socket) => {
      try {
        const peerConnection = new RTCPeerConnection(peerConnectionConfig);
  
        const handleIce = bindTrailingArgs(handleIceEvent, { socketId: participant.socketId, socket });
        const handleTrack = bindTrailingArgs(handleTrackEvent, {
          userDocumentId: participant.userDocumentId,
          mic: participant.mic,
          socketId: participant.socketId,
          isAnonymous: participant.isAnonymous,
          socket,
        });
  
        peerConnection.addEventListener('icecandidate', handleIce);
        peerConnection.addEventListener('track', handleTrack);
  
        myStreamRef.current.getTracks().forEach((track) => {
          if (!myStreamRef.current) return;
          peerConnection.addTrack(track, myStreamRef.current);
        });
  
        return peerConnection;
      } catch (e) {
        console.error(e);
        return undefined;
      }
    }, []);
  
    return setPeerConnection;
  };
  
  export const useRtc = () => {
    const peerConnectionsRef = useRef({});
    const [participants, setParticipants] = useState([]);
    const isAnonymous = useRecoilValue(anonymousState);
    const roomDocumentId = useRecoilValue(roomDocumentIdState);
    const [user] = useRecoilState(userTypeState);
    const socket = useSocket('/room');
    const [myStreamRef, myVideoRef, getLocalStream] = useLocalStream();
    const setPeerConnection = useSetPeerConnection(setParticipants, myStreamRef);
    const setRoomView = useSetRecoilState(roomViewState);
    const setToastList = useSetRecoilState(toastListSelector);
  
    useEffect(() => {
      if (!socket) return;
  
      const init = async () => {
        try {
          await getLocalStream();
          socket.emit(roomSocketMessage.join, {
            roomDocumentId, userDocumentId: user.userDocumentId, socketId: socket.id, isAnonymous,
          });
          setToastList(toastMessage.roomEnterSuccess());
        } catch (error) {
          setToastList(toastMessage.roomCreateDanger());
          setRoomView('createRoomView');
        }
      };
  
      init();
  
      socket.on(roomSocketMessage.join, async (participantsInfo) => {
        try {
          participantsInfo.forEach(async (participant) => {
            if (!myStreamRef.current) return;
            const peerConnection = setPeerConnection(participant, socket);
            if (!(peerConnection && socket)) return;
            peerConnectionsRef.current = { ...peerConnectionsRef.current, [participant.socketId]: peerConnection };
            const offer = await peerConnection.createOffer();
            peerConnection.setLocalDescription(offer);
  
            socket.emit(roomSocketMessage.offer, offer, participant.socketId);
          });
        } catch (error) {
          console.error(error);
        }
      });
  
      // eslint-disable-next-line @typescript-eslint/no-shadow
      socket.on(roomSocketMessage.offer, async (offer, userDocumentId, socketId, isAnonymous) => {
        if (!myStreamRef.current) return;
        const participant = {
          userDocumentId, socketId, isAnonymous, mic: false,
        };
        const peerConnection = setPeerConnection(participant, socket);
        if (!(peerConnection && socket)) return;
        peerConnectionsRef.current = { ...peerConnectionsRef.current, [socketId]: peerConnection };
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit(roomSocketMessage.answer, answer, socketId);
      });
  
      socket.on(roomSocketMessage.answer, async (answer, socketId) => {
        const peerConnection = peerConnectionsRef.current[socketId];
        if (!peerConnection) return;
        peerConnection.setRemoteDescription(answer);
      });
  
      socket.on(roomSocketMessage.ice, async (data) => {
        const peerConnection = peerConnectionsRef.current[data.candidateSendId];
        if (!peerConnection) return;
        await peerConnection.addIceCandidate(data.candidate);
      });
  
      socket.on(roomSocketMessage.leave, async (socketId) => {
        peerConnectionsRef.current[socketId].close();
        peerConnectionsRef.current[socketId] = null;
        delete peerConnectionsRef.current[socketId];
        setParticipants((oldParticipants) => oldParticipants?.filter((participant) => participant.socketId !== socketId));
      });
  
      return () => {
        setParticipants((oldParticipants) => {
          oldParticipants.forEach((participant) => {
            if (!peerConnectionsRef.current[participant.socketId]) return;
            peerConnectionsRef.current[participant.userDocumentId].close();
            peerConnectionsRef.current[participant.userDocumentId].onicecandidate = null;
            peerConnectionsRef.current[participant.userDocumentId].ontrack = null;
            peerConnectionsRef.current[participant.userDocumentId] = null;
            delete peerConnectionsRef.current[participant.userDocumentId];
          });
          return [];
        });
  
        myStreamRef.current?.getTracks()
          .forEach((track) => {
            track.stop();
          });
      };
    }, [socket, setPeerConnection]);
  
    return [participants, setParticipants, myVideoRef, roomDocumentId, user, socket, myStreamRef];
  };
  