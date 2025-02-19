// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // or your Next.js URL, e.g. "http://localhost:3000"
  },
});

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join_room", ({ chatRoomId, userId }) => {
    // If user was already connected on a different socket, disconnect it
    const oldSocketId = onlineUsers[userId];
    if (oldSocketId && oldSocketId !== socket.id) {
      io.sockets.sockets.get(oldSocketId)?.disconnect(true);
    }

    socket.join(chatRoomId);
    onlineUsers[userId] = socket.id;

    // Notify all that this user is now online
    io.emit("user_online", { userId });

    console.log(`User ${userId} joined room ${chatRoomId}`);
    console.log("🟢 Online Users:", onlineUsers);
  });

  socket.on("send_message", (messageData) => {
    console.log("📨 New Message:", messageData);
    // Send to everyone in the room
    io.to(messageData.chatRoomId).emit("receive_message", messageData);
  });

  socket.on("typing", ({ chatRoomId, userId }) => {
    // Everyone else in the room sees user typing
    socket.to(chatRoomId).emit("user_typing", { userId });
  });

  socket.on("stop_typing", ({ chatRoomId, userId }) => {
    socket.to(chatRoomId).emit("user_stopped_typing", { userId });
  });

  socket.on("disconnect", () => {
    const disconnectedUserId = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key] === socket.id
    );
    if (disconnectedUserId) {
      delete onlineUsers[disconnectedUserId];
      io.emit("user_offline", { userId: disconnectedUserId });
    }
    console.log("❌ User disconnected:", socket.id);
    console.log("🟢 Online Users:", onlineUsers);
  });
});

server.listen(3001, () => {
  console.log("🚀 Socket server running on port 3001");
});
