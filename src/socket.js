import { io } from "socket.io-client";

// 환경 변수에서 서버 주소를 불러옴
const socket = io(import.meta.env.VITE_SOCKET_SERVER_URL, {
  transports: ["websocket"], // WebSocket 명시적 사용
});

export default socket;