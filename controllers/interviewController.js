const interviewConversationRepository = require('../repositories/interviewConversationRepository');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');

exports.saveInterviewConversation = asyncErrorHandler(async (req, res, next) => {
  const { interviewId } = req.params;
  console.log(interviewId)

});