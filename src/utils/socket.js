import { io } from "socket.io-client";
import dotenv from "dotenv";
dotenv.config();

import cache from "./cache.js";
import EM from "./entity.js";

/**
 *
 * @author          Sark
 * @version         1.0.0
 * @description     Helper utils for web socket
 *
 */
class SystemSocket {
  constructor() {
    this.socket = io.connect(process.env.SYSTEM_SOCKET_SERVER, {
      reconnection: true,
    });
    this.socket.on("connect", () =>
      this.socket.emit("register", process.env.SERVICE_HANDLE)
    );
    this.socket.on("entities", (_response) => {
      cache.setEntities(_response);
      // EM.migrate();
    });
  }

  init = () => this.socket.emit("entities", process.env.SERVICE_HANDLE);
}

const SocketService = new SystemSocket();
export default SocketService;
