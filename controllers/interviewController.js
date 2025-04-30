const interviewConversationRepository = require("../repositories/interviewConversationRepository");
const interviewRepository = require("../repositories/interviewRepository");
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

    const responseData = {
      id: newConversation.id,
      interview_id: newConversation.interview_id,
      conversation: JSON.parse(newConversation.conversation),
      created_at: newConversation.created_at,
    };

    res.success(responseData, "Interview conversation saved successfully", 201);
  }
);
