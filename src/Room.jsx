import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "./socket";
import YouTube from "react-youtube";

export default function Room() {
  const { roomId } = useParams();

  const playerRef = useRef(null);
  const [videoId, setVideoId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [newVideoInput, setNewVideoInput] = useState("");
  const [skipCounts, setSkipCounts] = useState({ forward: 0, backward: 0 });
  const [skipCooldown, setSkipCooldown] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!isNicknameSet) return;

    socket.emit("join_room", { roomId, nickname });

    socket.on("room_data", ({ videoId, isHost, currentTime, isPlaying, skipCounts, usersCount, userList }) => {
      setVideoId(videoId);
      setIsHost(isHost);
      setSkipCounts(skipCounts || { forward: 0, backward: 0 });
      setUsersCount(usersCount || 0);
      setUserList(userList || []);

      if (playerRef.current) {
        playerRef.current.seekTo(currentTime || 0);
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      }
    });

    socket.on("video_changed", ({ videoId, currentTime, isPlaying, skipCounts }) => {
      setVideoId(videoId);
      setSkipCounts(skipCounts || { forward: 0, backward: 0 });
      if (playerRef.current) {
        playerRef.current.seekTo(currentTime || 0);
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      }
    });

    socket.on("video_play", () => {
      playerRef.current?.playVideo();
    });

    socket.on("video_pause", () => {
      playerRef.current?.pauseVideo();
    });

    socket.on("video_seek", ({ time }) => {
      if (playerRef.current) {
        const current = playerRef.current.getCurrentTime();
        if (Math.abs(current - time) > 1) {
          playerRef.current.seekTo(time, true);
        }
      }
    });

    socket.on("skip_counts_update", (counts) => {
      setSkipCounts(counts);
    });

    socket.on("user_list_update", (list) => {
      setUserList(list);
      setUsersCount(list.length);
    });

    socket.on("chat_message", ({ nickname, message }) => {
      setChatMessages((msgs) => [...msgs, { nickname, message }]);
    });

    socket.on("room_closed", () => {
    alert("방장이 퇴장하여 방이 종료되었습니다.");
    navigate("/");
    });

    return () => {
      socket.off("room_data");
      socket.off("video_changed");
      socket.off("video_play");
      socket.off("video_pause");
      socket.off("video_seek");
      socket.off("skip_counts_update");
      socket.off("user_list_update");
      socket.off("chat_message");
      socket.off("room_closed");
    };
  }, [roomId, isNicknameSet, nickname]);

  const extractVideoId = (urlOrId) => {
    try {
      const url = new URL(urlOrId);
      return url.searchParams.get("v") || url.pathname.split("/").pop();
    } catch {
      return urlOrId;
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("chat_message", { roomId, message: chatInput.trim() });
    setChatInput("");
  };

  const onChangeVideoInput = (e) => setNewVideoInput(e.target.value);

  const onChangeVideo = () => {
    if (!newVideoInput) return;
    const newId = extractVideoId(newVideoInput);
    if (!newId) return alert("유효한 유튜브 영상 URL 또는 ID를 입력하세요.");

    socket.emit("change_video", { roomId, newVideoId: newId });
    setNewVideoInput("");
  };

  const onPlay = () => {
    if (isHost) socket.emit("video_play", { roomId });
  };

  const onPause = () => {
    if (isHost) socket.emit("video_pause", { roomId });
  };

  const onSeek = (event) => {
    if (isHost) {
      const time = event.target.getCurrentTime();
      socket.emit("video_seek", { roomId, time });
    }
  };

  const onSkip = (direction) => {
    if (skipCooldown) return;
    socket.emit("skip_request", { roomId, direction });
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), 2000);
  };

  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!isNicknameSet) {
    return (
      <div style={{ padding: 20 }}>
        <h2>닉네임을 입력하세요</h2>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          style={{ padding: 5, fontSize: 16 }}
        />
        <button
          onClick={() => {
            if (!nickname.trim()) return alert("닉네임을 입력하세요.");
            setIsNicknameSet(true);
          }}
          style={{ marginLeft: 10, padding: "5px 15px", fontSize: 16 }}
        >
          입장
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "3vw",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', sans-serif",
        color: "#333",
      }}
    >
      <h2>방 ID: {roomId}</h2>
      <div>현재 인원: {usersCount}명</div>
      <button
        onClick={() => setShowUserList(!showUserList)}
        style={{ marginTop: 10 }}
      >
        {showUserList ? "인원 닫기" : "현재 인원 보기"}
      </button>

      {showUserList && (
        <ul>
          {userList.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      )}

      {isHost && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="유튜브 영상 URL 또는 ID 입력"
            value={newVideoInput}
            onChange={onChangeVideoInput}
            style={{ width: "60%", padding: 5, fontSize: 16 }}
          />
          <button
            onClick={onChangeVideo}
            style={{ marginLeft: 10, padding: "6px 12px", fontSize: 16 }}
          >
            영상 변경
          </button>
        </div>
      )}

      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={{
            width: "70%",
            height: "400",
            playerVars: {
              autoplay: 0,
              controls: 1,
              rel: 0,
            },
          }}
          onReady={(event) => (playerRef.current = event.target)}
          onPlay={onPlay}
          onPause={onPause}
          onStateChange={(e) => {
            if (e.data === 1 || e.data === 2) return; // 플레이/일시정지 무시
            if (isHost) {
              const time = e.target.getCurrentTime();
              socket.emit("video_seek", { roomId, time });
            }
          }}
        />
      ) : (
        <p>영상 로딩 중...</p>
      )}

      <div style={{ marginTop: 15 }}>
        <button onClick={() => onSkip("backward")} disabled={skipCooldown}>
          ⏪ 뒤로 5초 ({skipCounts.backward})
        </button>
        <button
          onClick={() => onSkip("forward")}
          disabled={skipCooldown}
          style={{ marginLeft: 10 }}
        >
          앞으로 5초 ⏩ ({skipCounts.forward})
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          border: "1px solid #ccc",
          padding: 10,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        <h3>채팅</h3>
        <div
          ref={chatBoxRef}
          style={{
            maxHeight: 140,
            overflowY: "auto",
            marginBottom: 10,
          }}
        >
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <strong>{msg.nickname}</strong> | {msg.message}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendChatMessage();
          }}
          placeholder="메시지를 입력하세요 (최대 10자)"
          style={{ width: "80%", padding: 5, fontSize: 14 }}
          maxLength={10}
        />
        <button
          onClick={sendChatMessage}
          style={{ padding: "5px 10px", marginLeft: 8 }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
