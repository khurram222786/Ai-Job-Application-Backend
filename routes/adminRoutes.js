const express = require("express");
const router = express.Router();
const adminController = require("./../controllers/adminController");
const { protect, authorize } = require("./../middleware/authMiddleware");
const responseHandler = require("../middleware/responseHandler");

router.use(responseHandler);

router
  .route("/jobs")
  .post(protect, authorize("admin"), adminController.createJob)
  .get(protect, adminController.getMyJobs);

router
  .route("/jobs/:id")
  .put(protect, authorize("admin"), adminController.updateJobById)
  .delete(protect, authorize("admin"), adminController.deleteJobById);

router.get(
  "/jobs/:jobId/applications",
  protect,
  authorize("admin"),
  adminController.getJobApplications
);

router.patch(
  "/applications/:applicationId/status",
  protect,
  authorize("admin"),
  adminController.updateApplicationStatus
);

router.get(
  "/applications/accepted",
  protect,
  authorize("admin"),
  adminController.getAcceptedApplications
);

router.post(
  "/users/:userId/interviews",
  protect,
  authorize("admin"),
  adminController.scheduleUserInterview
);


module.exports = router;
