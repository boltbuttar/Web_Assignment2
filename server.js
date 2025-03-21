const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const { verifyToken } = require("./middleware/authMiddleware");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");

// Import models for socket.io events
const Course = require("./models/Course");
const Student = require("./models/Student");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/university_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files
app.use(express.static(path.join(__dirname, "public")));

// WebSockets for Real-Time Updates
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join admin dashboard
    socket.on("joinAdminDashboard", () => {
        socket.join("admin-dashboard");
        console.log(`Socket ${socket.id} joined admin-dashboard`);
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Make io accessible to routes
app.set("io", io);

// Routes
app.get("/", (req, res) => {
    res.redirect("/auth/login");
});

app.get("/auth/login", (req, res) => {
    res.render("auth/adminLogin", { title: "Admin Login" });
});

app.get("/auth/student/login", (req, res) => {
    res.render("auth/studentLogin", { title: "Student Login" });
});

// Protected Routes
app.use("/auth", authRoutes);
app.use("/admin", verifyToken, adminRoutes);
app.use("/student", verifyToken, studentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.xhr || req.path.startsWith('/api/')) {
        // For API requests, return JSON error
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: err.message
        });
    } else {
        // For page requests, render error page
        res.status(500).render('error', {
            message: "Internal Server Error",
            error: err
        });
    }
});

// Handle 404 errors
app.use((req, res) => {
    console.log("404 Not Found:", req.path);
    if (req.xhr || req.path.startsWith('/api/')) {
        // For API requests, return JSON error
        res.status(404).json({
            success: false,
            message: "Route not found"
        });
    } else {
        // For page requests, render 404 page
        res.status(404).render('error', {
            message: "Page not found",
            error: { status: 404 }
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export io for use in controllers
module.exports = { io, app };
