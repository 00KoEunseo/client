import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "./socket";
import YouTube from "react-youtube";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const playerRef = useRef(null);

  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);

  const [videoId, setVideoId] = useState("");
  const [isHost, setIsHost] = useState(false);

  const [skipCounts, setSkipCounts] = useState({ forward: 0, backward: 0 });
  const [skipCooldown, setSkipCooldown] = useState(false);

  const [usersCount, setUsersCount] = useState(0);
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const chatBoxRef = useRef(null);

  const [isLocked, setIsLocked] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [newVideoInput, setNewVideoInput] = useState("");

  const [recommendQueue, setRecommendQueue] = useState([]);
  const [recommendInput, setRecommendInput] = useState("");

  const [boreVoteCount, setBoreVoteCount] = useState(0);
  const [hasVotedBore, setHasVotedBore] = useState(false);

  // 1. 방 정보 요청 (방 잠금 여부 등)
  useEffect(() => {
    socket.emit("get_room_info", { roomId });

    socket.once("room_info", (info) => {
      setIsLocked(info.isLocked || false);
    });

    socket.once("error", ({ message }) => {
      alert(message);
      navigate("/");
    });

    return () => {
      socket.off("room_info");
      socket.off("error");
    };
  }, [roomId, navigate]);

  // 2. 닉네임, 비밀번호, join_room 및 주요 socket 이벤트 등록
  useEffect(() => {
    if (!isNicknameSet) return;
    if (isLocked && !isHost && !passwordEntered) return;

    socket.emit("join_room", { roomId, nickname, password: roomPassword });

    socket.on("room_data", (data) => {
      setVideoId(data.videoId);
      setIsHost(data.isHost);
      setSkipCounts(data.skipCounts || { forward: 0, backward: 0 });
      setUsersCount(data.usersCount || 0);
      setUserList(data.userList || []);
      setIsLocked(data.isLocked || false);
      setPasswordEntered(true);
      setErrorMessage("");
      if (playerRef.current) {
        playerRef.current.seekTo(data.currentTime || 0);
        if (data.isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      }
      setRecommendQueue(data.recommendQueue || []);
    });

    socket.on("error", ({ message }) => {
      setErrorMessage(message);
      setPasswordEntered(false);
      // 비밀번호 오류시 재입력 유도
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

    socket.on("video_play", () => playerRef.current?.playVideo());
    socket.on("video_pause", () => playerRef.current?.pauseVideo());

    socket.on("video_seek", ({ time }) => {
      if (playerRef.current) {
        const current = playerRef.current.getCurrentTime();
        if (Math.abs(current - time) > 1) {
          playerRef.current.seekTo(time, true);
        }
      }
    });

    socket.on("skip_counts_update", setSkipCounts);
    socket.on("user_list_update", (list) => {
      setUserList(list);
      setUsersCount(list.length);
    });

    socket.on("chat_message", ({ nickname, message }) => {
      setChatMessages((msgs) => [...msgs, { nickname, message }]);
    });

    socket.on("recommend_queue_updated", (queue) => {
      setRecommendQueue(queue);
    });

    socket.on("room_closed", () => {
      alert("방장이 퇴장하여 방이 종료되었습니다.");
      navigate("/");
    });

    socket.on("request_host_time", () => {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      socket.emit("host_time_response", { roomId, currentTime });
    });

    socket.on("bore_vote_update", (count) => {
      setBoreVoteCount(count);
      if (count === 0) {
        setHasVotedBore(false); // 투표 초기화 시 버튼 다시 활성화
      }
    });

    return () => {
      socket.off("room_data");
      socket.off("error");
      socket.off("video_changed");
      socket.off("video_play");
      socket.off("video_pause");
      socket.off("video_seek");
      socket.off("skip_counts_update");
      socket.off("user_list_update");
      socket.off("chat_message");
      socket.off("room_closed");
      socket.off("request_host_time");
      socket.off("recommend_queue_updated");
      socket.off("bore_vote_update");
    };
  }, [isNicknameSet, isLocked, isHost, passwordEntered, roomId, nickname, roomPassword, navigate]);

  // 3. 호스트 currentTime 업데이트 주기적 전송
  useEffect(() => {
    if (!isHost) return;

    const intervalId = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        socket.emit("host_current_time_update", { roomId, currentTime });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isHost, roomId]);

  // 4. 채팅창 자동 스크롤
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 유튜브 영상 ID 추출
  const extractVideoId = (urlOrId) => {
    try {
      const url = new URL(urlOrId);
      return url.searchParams.get("v") || url.pathname.split("/").pop();
    } catch {
      return urlOrId;
    }
  };

  // 인원 갱신
  const outRoom = () => {
    socket.emit("disconnect_button");
  };

  //추천영상 등록 함수
  const onAddRecommendation = () => {
  const newId = extractVideoId(recommendInput);
  if (!newId) {
    alert("유효한 유튜브 영상 URL 또는 ID를 입력하세요.");
    return;
  }

  socket.emit("add_recommend_video", { roomId, videoId: newId });
  setRecommendInput("");
};

//호스트영상 종료시 다음추천영상 재생함수
const onVideoEnd = () => {
  if (!isHost) return;
  socket.emit("video_ended", { roomId });
};

  // 채팅 메시지 전송
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("chat_message", { roomId, message: chatInput.trim() });
    setChatInput("");
  };

  // 영상 변경 입력 처리
  const onChangeVideoInput = (e) => setNewVideoInput(e.target.value);

  const onChangeRecommendInput = (e) => setRecommendInput(e.target.value);

  // 영상 변경 요청 (호스트만)
  const onChangeVideo = () => {
    if (!newVideoInput) return;
    const newId = extractVideoId(newVideoInput);
    if (!newId) return alert("유효한 유튜브 영상 URL 또는 ID를 입력하세요.");

    socket.emit("change_video", { roomId, newVideoId: newId });
    setNewVideoInput("");
  };

  // 영상 재생 이벤트 (호스트만)
  const onPlay = () => {
    if (isHost) socket.emit("video_play", { roomId });
  };

  // 영상 일시정지 이벤트 (호스트만)
  const onPause = () => {
    if (isHost) socket.emit("video_pause", { roomId });
  };

  // 영상 탐색 이벤트 (호스트만) - onStateChange에서도 호출됨
  const onSeek = (event) => {
    if (isHost) {
      const time = event.target.getCurrentTime();
      socket.emit("video_seek", { roomId, time });
    }
  };

  // 10초 앞으로/뒤로 스킵 요청
  const onSkip = (direction) => {
    if (skipCooldown) return;
    socket.emit("skip_request", { roomId, direction });
    setSkipCooldown(true);
    setTimeout(() => setSkipCooldown(false), 2000);
  };

  //지루한 영상 스킵 투표!
  const handleBoreVote = () => {
    if (hasVotedBore) return;
    socket.emit("bore_vote", { roomId });
    setHasVotedBore(true);
  };

  // 닉네임 미설정 시 닉네임 입력 UI
  if (!isNicknameSet) {
    return (
      <div
    style={{
      height: "100vh",
       width: "100vw",
      flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        display: "flex",
    }}
  >
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
            setErrorMessage("");
          }}
          style={{ marginLeft: 10, padding: "5px 15px", fontSize: 16 }}
        >
          입장
        </button>
      </div>
    );
  }

  // 비밀번호 입력이 필요한 방 UI
  if (isLocked && !isHost && !passwordEntered) {
    return (
      <div
    style={{
      height: "100vh",
       width: "100vw",
      flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        display: "flex",
    }}
  >
        <h2>비밀번호를 입력하세요</h2>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        <input
          type="password"
          value={roomPassword}
          onChange={(e) => setRoomPassword(e.target.value)}
          placeholder="비밀번호"
          style={{ padding: 5, fontSize: 16 }}
        />
        <button
          onClick={() => {
            if (!roomPassword.trim()) return alert("비밀번호를 입력하세요.");
            setPasswordEntered(true);
            setErrorMessage("");
          }}
          style={{ marginLeft: 10, padding: "5px 15px", fontSize: 16 }}
        >
          확인
        </button>
      </div>
    );
  }
return (
  <div
    style={{
      padding: "0vw",
      marginLeft: 40,
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#333",
      backgroundColor: "#ffffff", // 아이보리톤 배경
    }}
  >
    <h2>방 ID: {roomId} </h2>
      <button
        onClick={() => setShowUserList(!showUserList)}
        style={{ marginTop: 2, width: "60%",borderRadius: 4,
            border: "1px solid #ccc",
            outline: "none",
            backgroundColor: "#fff", }}
        
      >
        {showUserList ? "인원 닫기   (" : "현재 인원 보기   ("}{usersCount}명{")"}
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
          style={{
            width: "60%",
            padding: 8,
            fontSize: 16,
            borderRadius: 4,
            border: "1px solid #ccc",
            outline: "none",
            backgroundColor: "#fff",
          }}
        />
        <button
          onClick={onChangeVideo}
          style={{
            marginLeft: 10,
            padding: "8px 16px",
            fontSize: 16,
            borderRadius: 4,
            border: "none",
            backgroundColor: "#a1a1a1",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          영상 변경
        </button>
      </div>
    )}

    <div style={{ marginTop: 5 }}>
      <input
        type="text"
        placeholder="유튜브 영상 URL 또는 ID 입력"
        value={recommendInput}
        onChange={onChangeRecommendInput}
        style={{
          width: "60%",
          padding: 8,
          fontSize: 16,
          borderRadius: 4,
          border: "1px solid #ccc",
          outline: "none",
          backgroundColor: "#fff",
        }}
      />
      <button
        onClick={onAddRecommendation}
        style={{
          marginLeft: 10,
          padding: "8px 16px",
          fontSize: 16,
          borderRadius: 4,
          border: "none",
          backgroundColor: "#a1a1a1",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        영상 등록
      </button>
    </div>

    <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: "30px",
    marginTop: 20,
    width: "100%",
    maxWidth: 1400,
  }}
>
  {videoId ? (
    <YouTube
      videoId={videoId}
      opts={{
        width: "888",
        height: "500",
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
        },
      }}
      onReady={(event) => (playerRef.current = event.target)}
      onPlay={onPlay}
      onPause={onPause}
      onStateChange={(e) => {
        if (e.data === 0) {
          onVideoEnd();
          return;
        }
        if (e.data === 1 || e.data === 2) return;
        if (isHost) {
          const time = e.target.getCurrentTime();
          socket.emit("video_seek", { roomId, time });
        }
      }}
    />
  ) : (
    <p>영상 로딩 중...</p>
  )}

  {/* 영상 등록 목록 + 채팅창을 감싸는 컨테이너 */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      width: "280px",
      height: "480px",
    }}
  >
    {/* 영상 등록 목록 */}
    <div
      style={{
        flex: "0 0 auto",
        border: "1px solid #ccc",
        padding: "15px",
        height: "220px", // 높이 조절: 반절 정도 (영상 등록 목록 너무 길면 스크롤)
        overflowY: "auto",
        backgroundColor: "#f0f0f0",
        borderRadius: 6,
        color: "#555",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 15, color: "#444" }}>영상 등록 목록</h3>
      {recommendQueue.length === 0 ? (
        <p>등록된 영상이 없습니다.</p>
      ) : (
        <ul style={{ paddingLeft: 20 }}>
          {recommendQueue.map((videoId, index) => (
            <li key={videoId + index} style={{ marginBottom: 10 }}>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#666", textDecoration: "none" }}
                onMouseEnter={(e) => (e.target.style.color = "#a1a1a1")}
                onMouseLeave={(e) => (e.target.style.color = "#666")}
              >
                {videoId}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* 채팅창 */}
    <div
      style={{
        flex: "1 1 auto",
        border: "1px solid #ccc",
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 6,
        color: "#444",
        display: "flex",
        flexDirection: "column",
        height: "calc(480px - 220px - 20px)", // 영상 등록 목록 높이 + gap 만큼 뺌
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 15, color: "#333" }}>채팅</h3>
      <div
        ref={chatBoxRef}
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          marginBottom: 10,
          paddingRight: 10,
          color: "#333",
        }}
      >
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <strong>{msg.nickname}</strong> | {msg.message}
          </div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendChatMessage();
          }}
          placeholder="메시지를 입력하세요 (최대 10자)"
          style={{
            flex: "1 1 auto",
            padding: 8,
            fontSize: 14,
            borderRadius: 4,
            border: "1px solid #ccc",
            outline: "none",
          }}
          maxLength={10}
        />
        <button
          onClick={sendChatMessage}
          style={{
            padding: "8px 16px",
            marginLeft: 8,
            backgroundColor: "#a1a1a1",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          전송
        </button>
      </div>
    </div>
  </div>
</div>


    <div style={{ marginTop: 5 }}>
      <button
        onClick={() => onSkip("backward")}
        disabled={skipCooldown}
        style={{
          backgroundColor: "#d1d1d1",
          border: "none",
          borderRadius: 6,
          padding: "10px 18px",
          fontSize: 16,
          cursor: skipCooldown ? "not-allowed" : "pointer",
          color: "#555",
        }}
      >
        ⏪ 뒤로 10초 ({skipCounts.backward})
      </button>
      <button
        onClick={() => onSkip("forward")}
        disabled={skipCooldown}
        style={{
          marginLeft: 15,
          backgroundColor: "#d1d1d1",
          border: "none",
          borderRadius: 6,
          padding: "10px 18px",
          fontSize: 16,
          cursor: skipCooldown ? "not-allowed" : "pointer",
          color: "#555",
        }}
      >
        앞으로 10초 ⏩ ({skipCounts.forward})
      </button>
      <button
        onClick={handleBoreVote}
        disabled={hasVotedBore}
        style={{
          marginLeft: 465,
          backgroundColor: "#b5b5b5",
          border: "none",
          borderRadius: 6,
          padding: "10px 18px",
          fontSize: 16,
          cursor: hasVotedBore ? "not-allowed" : "pointer",
          color: "#fff",
        }}
      >
        노잼! ({boreVoteCount})
      </button>
    </div>

    <div style={{ marginTop: 5 }}>
      <button
        onClick={() => {
          navigate("/");
          outRoom();
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#d8d8d8",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          color: "#555",
          fontWeight: "bold",
        }}
      >
        나가기
      </button>
    </div>
  </div>
);

}