import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:4000", {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
    });
  }
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}

let _chatSocket: Socket | null = null;

const socketBase = () =>
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:4000";

export function getChatSocket(): Socket {
  if (!_chatSocket) {
    _chatSocket = io(`${socketBase()}/chat`, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
    });
  }
  return _chatSocket;
}

export function disconnectChatSocket() {
  _chatSocket?.disconnect();
  _chatSocket = null;
}

let _raidSocket: Socket | null = null;

export function getRaidSocket(): Socket {
  if (!_raidSocket) {
    _raidSocket = io(`${socketBase()}/raid`, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
    });
  }
  return _raidSocket;
}

export function disconnectRaidSocket() {
  _raidSocket?.disconnect();
  _raidSocket = null;
}

let _battleSocket: Socket | null = null;

export function getBattleSocket(): Socket {
  if (!_battleSocket) {
    _battleSocket = io(`${socketBase()}/battle`, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
    });
  }
  return _battleSocket;
}

export function disconnectBattleSocket() {
  _battleSocket?.disconnect();
  _battleSocket = null;
}
