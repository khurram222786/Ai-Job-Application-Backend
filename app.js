require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./config/sequelize");
const bodyParser = require("body-parser");
const setupRoutes = require("./config/routes");
const { configureCloudinary } = require("./config/cloudinary");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure Cloudinary (using the exported function)
configureCloudinary();

// Setup routes
setupRoutes(app);

// Start server
sequelize
  .sync()
  .then(() => {
    console.log("Database synced");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => console.error("Unable to sync database:", err));
