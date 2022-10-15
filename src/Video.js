import React from 'react';
import AgoraRTM from 'agora-rtm-sdk';
let appId = '1d8d22987b394e23a9938498b6f28c04';
let token = '';
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;
let constraints = {
  video: true,
  audio: true,
};
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};
export default function Video({ roomId, onLeave }) {
  const localStream = React.useRef();
  const remoteStream = React.useRef();
  let peerConnection;
  React.useEffect(() => {
    init(roomId);
    window.addEventListener('beforeunload', leaveChannel);

    return () => {
      window.removeEventListener('beforeunload', leaveChannel);
    };
  }, []);

  const init = async (roomId) => {
    client = await AgoraRTM.createInstance(appId);
    await client.login({ uid, token });

    channel = client.createChannel(roomId);
    await channel.join();
    channel.on('MemberJoined', handleUserJoined);
    client.on('MessageFromPeer', handleMessageFromPeer);
    channel.on('MemberLeft', handleUserLeft);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('user-1').srcObject = stream;
    localStream.current = stream;

    // createOffer(MemberId);
  };

  const createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers);
    const stream = new MediaStream();
    document.getElementById('user-2').srcObject = stream;
    document.getElementById('user-2').style.display = 'block';
    remoteStream.current = stream;
    if (!localStream.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      document.getElementById('user-1').srcObject = stream;
      localStream.current = stream;
    }
    localStream.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream.current);
    });

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('New Ice Candidate', event.candidate);
        client.sendMessageToPeer(
          {
            text: JSON.stringify({
              type: 'candidate',
              candidate: event.candidate,
            }),
          },
          MemberId
        );
      }
    };
  };

  let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId);

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer(
      { text: JSON.stringify({ type: 'offer', offer: offer }) },
      MemberId
    );
  };

  let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId);

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer(
      { text: JSON.stringify({ type: 'answer', answer: answer }) },
      MemberId
    );
  };

  let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
      peerConnection.setRemoteDescription(answer);
    }
  };

  const leaveChannel = async () => {
    localStream.current.getTracks()[0].stop();
    localStream.current.getTracks()[1].stop();
    await channel.leave();
    await client.logout();

    onLeave();
  };
  let toggleCamera = async () => {
    let videoTrack = localStream.current
      .getTracks()
      .find((track) => track.kind === 'video');

    if (videoTrack.enabled) {
      videoTrack.enabled = false;
    } else {
      videoTrack.enabled = true;
    }
  };
  let toggleMic = async () => {
    let audioTrack = localStream.current
      .getTracks()
      .find((track) => track.kind === 'audio');

    if (audioTrack.enabled) {
      audioTrack.enabled = false;
    } else {
      audioTrack.enabled = true;
    }
  };

  const handleUserJoined = async (MemberId) => {
    console.log('A new user joined***********************', MemberId);
    createOffer(MemberId);
  };

  const handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text);

    if (message.type === 'offer') {
      createAnswer(MemberId, message.offer);
    }

    if (message.type === 'answer') {
      addAnswer(message.answer);
    }

    if (message.type === 'candidate') {
      if (peerConnection) {
        peerConnection.addIceCandidate(message.candidate);
      }
    }
  };

  const handleUserLeft = () => {
    document.getElementById('user-2').style.display = 'none';
  };

  React.useEffect(() => {}, []);
  return (
    <div>
      <div id="videos">
        <video
          ref={localStream}
          className="video-player"
          id="user-1"
          autoPlay
          playsInline
        ></video>
        <video
          ref={remoteStream}
          className="video-player"
          id="user-2"
          autoPlay
          playsInline
        ></video>
      </div>
      <button
        onClick={() => {
          leaveChannel();
        }}
      >
        Leave
      </button>
      <button onClick={() => toggleCamera()}>toggle cam</button>
      <button onClick={() => toggleMic()}>toggleMic</button>
    </div>
  );
}
