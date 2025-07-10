const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 5000;
const fs = require("fs");
const historyPath = path.join(__dirname, "chat_history.json");

if (!fs.existsSync(historyPath)) {
  fs.writeFileSync(historyPath, "[]", "utf-8");
}

function loadChatHistory() {
  try {
    const data = fs.readFileSync(historyPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read chat history:", err);
    return [];
  }
}

function saveMessage(msgObj) {
  const history = loadChatHistory();
  history.push(msgObj);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}


const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const io = require("socket.io")(server);

let connectedUsers = new Map();

io.on("connection", onConnected);

function onConnected(socket) {
  //console.log("connected id : ", socket.id);

  const history = loadChatHistory();
  socket.emit("chat_history", history);

 socket.on("user_join", (data) => {
  for (let [sockId, user] of connectedUsers) {
    if (user.id === data.name) {
      const existingSocket = io.sockets.sockets.get(sockId);
      if (existingSocket) existingSocket.disconnect(true);
      connectedUsers.delete(sockId);
    }
  }

  const user = {
    id: data.name,
    color: data.color,
    socketId: socket.id,
    joinedAt: new Date().toISOString(),
  };

  connectedUsers.set(socket.id, user);

  const sysMsg = {
    userID: "System",
    msg: `${user.id} joined the chat.`,
    timestamp: new Date().toISOString()
  };

  io.emit("add_msg", sysMsg);

  // ✅ THIS LINE WAS MISSING:
  io.emit("users_update", getConnectedUsers());
});



socket.on("send_msg", (data) => {
  const user = connectedUsers.get(socket.id);
  const msgData = {
    msg: data,
    userID: user.id,
    timestamp: new Date().toISOString(),
  };

  saveMessage(msgData); // ✅ persist it

  io.emit("add_msg", msgData);
});


  socket.on('typing_start', () => {
  const user = connectedUsers.get(socket.id);
  if (user) {
    socket.broadcast.emit('typing_start', user.id);
  }
});

socket.on('typing_stop', () => {
  const user = connectedUsers.get(socket.id);
  if (user) {
    socket.broadcast.emit('typing_stop', user.id);
  }
});


  socket.on("disconnect", () => {
  const user = connectedUsers.get(socket.id);
  if (user) {
    connectedUsers.delete(socket.id);
    io.emit("users_update", getConnectedUsers());

    io.emit("add_msg", {
      userID: "System",
      msg: `${user.id} left the chat.`,
      timestamp: new Date().toISOString()
    });
  }
});

}

function getConnectedUsers() {
  return Array.from(connectedUsers.values()).map((user) => ({
    id: user.id,
    color: user.color,
    joinedAt: user.joinedAt,
  }));
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server Running at PORT : ", PORT);
});
