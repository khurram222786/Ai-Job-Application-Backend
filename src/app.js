require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./config/sequelize");
const bodyParser = require("body-parser");
const setupRoutes = require("./config/routes");
const InterviewWebSocketService = require('./socket/server');
const rateLimit = require('express-rate-limit');


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup routes
setupRoutes(app);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server
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
