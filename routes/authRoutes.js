const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const responseHandler = require("../middleware/responseHandler");

router.use(responseHandler);

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);

module.exports = router;
