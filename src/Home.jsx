import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>스킵 상영관!</h1>
      <button onClick={() => navigate("/create")}>방 생성하기</button>
      <button onClick={() => navigate("/join")}>방 참가하기</button>
    </div>
  );
}
