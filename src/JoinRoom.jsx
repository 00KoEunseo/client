import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId) {
      alert("방 코드를 입력하세요.");
      return;
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div>
      <h2>방 참가하기</h2>
      <input
        type="text"
        placeholder="방 코드 입력"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoin}>입장</button>
    </div>
  );
}
