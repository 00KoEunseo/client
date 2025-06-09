import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import socket from "./socket";


export default function CreateRoom() {
  const [roomId, setRoomId] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const navigate = useNavigate();

  // 유튜브 URL에서 videoId 추출
  const extractVideoId = (url) => {
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleCreate = () => {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      alert("유효한 유튜브 URL을 입력하세요.");
      return;
    }
    if (!roomId) {
      alert("방 코드를 입력하세요.");
      return;
    }

    socket.emit("create_room", { roomId, videoId });

    socket.once("room_created", ({ roomId }) => {
      navigate(`/room/${roomId}`);
    });

    socket.once("error", ({ message }) => {
      alert(message);
    });
  };

  return (
    <div>
      <h2>방 생성하기</h2>
      <input
        type="text"
        placeholder="방 코드 입력"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <input
        type="text"
        placeholder="유튜브 영상 URL"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
      />
      <button onClick={handleCreate}>방 생성</button>
    </div>
  );
}
