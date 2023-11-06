import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import routes from "./routes/index.js";
import socket from "./utils/socket.js";
import DBM from "./utils/db.js";

class ApiServer {
  constructor() {
    /* Load the express */
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  setupMiddlewares = () => {
    this.app.use((req, res, next) => {
      next();
    });

    /**
     *
     * Global exception handler
     *
     */
    this.app.use((err, req, res, next) => {
      if (!err) {
        return next();
      }
      console.error(err.stack);
      res.status(500);
      res.send(err.message ? err.message : "Internal server error");
    });

    this.app.use(express.json());
    this.app.use(cors());
  };

  setupRoutes = () => {
    this.app.use("/accounts_service/v1", cors(), routes);
  };

  listen = async () => {
    try {
      await DBM.iniDBConnections();
      socket.init();
      this.app.listen(process.env.PORT);
    } catch (_e) {
      console.log(_e);
    }
  };
}

/* Kick start the server */
const server = new ApiServer();
server.listen();
