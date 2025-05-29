const interviewConversationRepository = require("../repositories/interviewConversationRepository");
const interviewRepository = require("../repositories/interviewRepository");
const jobRepository = require('../repositories/jobRepository')
const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const CustomError = require("../Utils/customError");

exports.saveInterviewConversation = asyncErrorHandler(
  async (req, res, next) => {
    const { interviewId } = req.params;
    const conversation = req.body;

    const interview = await interviewRepository.findInterviewById(interviewId);
    if (!interview) {
      return next(new CustomError("Interview not found", 404));
    }
    else if(interview.user_id!==req.user.user_id){  
      return next(new CustomError("This user does not have a scheduled interview", 404));
    }

    const existingConversation =
      await interviewConversationRepository.findConversationByInterviewId(
        interviewId
      );
    if (existingConversation) {
      return next(
        new CustomError("Conversation already exists for this interview", 409)
      );
    }

    const conversationString = JSON.stringify(conversation);
    const newConversation =
      await interviewConversationRepository.createConversation({
        interview_id: interviewId,
        conversation: conversationString,
      });


    const responseData = JSON.parse(newConversation.conversation);

    res.success(responseData, "Interview conversation saved successfully", 201);
  }
);



exports.getJobInterviews = asyncErrorHandler(async (req, res, next) => {
  const {jobId} = req.params;

  const jobExists = await jobRepository.findJobById(jobId);

  if (!jobExists) {
    return next(new CustomError("Job not found", 404));
  }

  const interviews = await interviewRepository.getInterviewsByJobId(jobId);

  res.success({
    interviews,
  });
});