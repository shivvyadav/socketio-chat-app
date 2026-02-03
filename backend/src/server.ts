import http from "http";
import express from "express";
import {Server} from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

// socket code goes here
const ROOM = "group";

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("joinChat", async (userName) => {
    console.log(`${userName} has joined the chat`);
    await socket.join(ROOM);

    //send notification to all
    // io.to(ROOM).emit("chatNotice", userName);

    //send notification to all except new user
    socket.to(ROOM).emit("chatNotice", userName);
  });

  // broadcast message
  socket.on("message", (msg) => {
    socket.to(ROOM).emit("message", msg);
  });

  socket.on("typing", (userName) => {
    socket.to(ROOM).emit("typing", userName);
  });

  socket.on("stopTyping", (userName) => {
    socket.to(ROOM).emit("stopTyping", userName);
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

server.listen(3000, () => {
  console.log("server listening on port 3000");
});
