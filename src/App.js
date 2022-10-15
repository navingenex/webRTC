import React from 'react';
import './style.css';
import Video from './Video';
export default function App() {
  const [roomId, setRoomId] = React.useState('');
  const [submit, setSubmit] = React.useState(false);
  return (
    <div>
      {!submit ? (
        <div>
          <input
            value={roomId}
            placeholder="Enter roomId"
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={() => setSubmit(true)}>Join</button>
        </div>
      ) : (
        <Video onLeave={() => setSubmit(false)} roomId={roomId} />
      )}
    </div>
  );
}
