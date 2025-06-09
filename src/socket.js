import { io } from "socket.io-client";
const socket = io("http://localhost:4000"); // 명시적으로 WebSocket 사용
export default socket;