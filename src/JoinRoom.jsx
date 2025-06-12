import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import socket from "./socket";

export default function JoinRoom() {
  const [roomId, setRoomId] = useState("");
  const [roomList, setRoomList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const navigate = useNavigate();
  const refreshRoomList = () => {
    socket.emit("get_room_list", { page });
  };


  useEffect(() => {
    socket.emit("get_room_list", { page });

    socket.on("room_list", ({ rooms, hasNextPage }) => {
      setRoomList(rooms);
      setHasNextPage(hasNextPage);
    });

    return () => {
      socket.off("room_list");
    };

    refreshRoomList();
    
  }, [page]);

  const handleJoin = () => {
    if (!roomId) {
      alert("방 코드를 입력하세요.");
      return;
    }
    navigate(`/room/${roomId}`);
  };

  const handleJoinFromList = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <div
    style={{
      height: "100vh",
      width: "100vw",
      flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
    }}
  >

      <div style={{ marginTop: "50px" }}>
        <button onClick={() => navigate("/")}>홈으로</button>
      </div>

      <h2>방 참가하기</h2>
      {/* 직접 입력 */}
      <input
        type="text"
        placeholder="방 코드 입력"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoin}>입장</button>

      <hr />

      {/* 방 목록 */}
      <h3>방 목록</h3>
      {roomList.length === 0 ? (
        <p>현재 열려있는 방이 없습니다.</p>
      ) : (
        <ul>
          {roomList.map((room) => (
            <li key={room.roomId}>
              <button onClick={() => handleJoinFromList(room.roomId)}>
                {room.isLocked && <span style={{ color: "red" }}>🔒</span>}{room.displayName} 
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 페이지 이동 */}
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
          이전
        </button>
        <span style={{ margin: "0 10px" }}>페이지 {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={!hasNextPage}>
          다음
        </button>
      </div>
       <button onClick={refreshRoomList}>방 목록 새로고침</button>

    </div>
  );
}