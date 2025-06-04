require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./config/sequelize");
const bodyParser = require("body-parser");
const setupRoutes = require("./config/routes");
const { configureCloudinary } = require('./config/cloudinary');
const InterviewWebSocketService = require('./socket/server');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Setup routes
setupRoutes(app);
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

// Initialize WebSocket service
new InterviewWebSocketService(server);

// Database sync
sequelize.sync()
  .then(() => {
    console.log("Database synced");
  })
  .catch((err) => console.error("Unable to sync database:", err));