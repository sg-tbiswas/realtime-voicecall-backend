import express, { Request, Response } from "express";
import { createServer, Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";

// Initialize Express
const app = express();

// Set up CORS middleware for Express
app.use(
  cors({
    origin: "http://localhost:3000", // Update this to the origin of your client
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials (e.g., cookies) if needed
  })
);

// Create an HTTP server
const httpServer: HTTPServer = createServer(app);

// Initialize Socket.io on the server
const io = new SocketIOServer(httpServer, {
  path: "/socket", // Define the WebSocket path
  cors: {
    origin: "http://localhost:3000", // Update this to the origin of your client
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials (e.g., cookies) if needed
  },
});

// Store online users
const onlineUsers: Map<string, any> = new Map();

// Handle WebSocket connections
io.on("connection", (socket: Socket) => {
  console.log("User connected", socket.id);

  // Handle user-online event
  socket.on("user-online", (user: any) => {
    // Now we store the socket ID along with the user details
    onlineUsers.set(socket.id, { ...user, socketId: socket.id });
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  // Handle user disconnect event
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  // Handle call-related events

  socket.on("call-request", (data) => {
    console.log("Call request received on server:", data);
    const { to } = data;
    const caller = onlineUsers.get(socket.id);
    console.log("Caller:", caller);

    if (caller) {
      // Emit to the recipient's socket ID
      io.to(to).emit("call-request", { caller });
    }
  });

  socket.on("call-accepted", (data: { to: string }) => {
    const caller = onlineUsers.get(socket.id);
    socket.to(data.to).emit("call-accepted", { caller });
  });

  socket.on("call-rejected", (data: { to: string }) => {
    socket.to(data.to).emit("call-rejected");
  });

  socket.on("webrtc-offer", (data: { to: string; offer: any }) => {
    const caller = onlineUsers.get(socket.id);
    socket.to(data.to).emit("webrtc-offer", { data, caller });
  });

  socket.on("webrtc-answer", (data: { to: string; answer: any }) => {
    console.log("webrtc-answer", data);
    socket.to(data.to).emit("webrtc-answer", data);
  });

  socket.on("webrtc-ice-candidate", (data: { to: string; candidate: any }) => {
    socket.to(data.to).emit("webrtc-ice-candidate", data);
  });
});

// Define a basic route
app.get("/", (req: Request, res: Response) => {
  res.send("WebSocket server is running");
});

// Start the server on port 3000
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
