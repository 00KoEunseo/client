import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1>스킵 상영관</h1>
      <button onClick={() => navigate("/create")} style={{ margin: "10px" }}>
        방 생성하기
      </button>
      <button onClick={() => navigate("/join")} style={{ margin: "10px" }}>
        방 참가하기
      </button>
    </div>
  );
}
