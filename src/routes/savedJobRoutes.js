const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const savedJobController = require("../controllers/savedJobController");
const responseHandler = require("../middleware/responseHandler");
const { validateSaveJob, validateGetSavedJobs } = require("../validators/savedJobValidator");

router.use(responseHandler);

// Save a job
router.post(
  "/jobs/:jobId/save",
  protect,
  authorize("user"),
  validateSaveJob,
  savedJobController.saveJob
);

// Unsave a job
router.delete(
  "/jobs/:jobId/save",
  protect,
  authorize("user"),
  validateSaveJob,
  savedJobController.unsaveJob
);

// Get all saved jobs for the authenticated user
router.get(
  "/saved-jobs",
  protect,
  authorize("user"),
  validateGetSavedJobs,
  savedJobController.getSavedJobs
);

// Check if a specific job is saved by the user
router.get(
  "/jobs/:jobId/saved",
  protect,
  authorize("user"),
  validateSaveJob,
  savedJobController.checkIfJobSaved
);

// Get saved job IDs (useful for filtering)
router.get(
  "/saved-job-ids",
  protect,
  authorize("user"),
  savedJobController.getSavedJobIds
);

module.exports = router; 