import { io } from "socket.io-client";
const socket = io("https://server-uh7v.onrender.com"); // 명시적으로 WebSocket 사용
export default socket;