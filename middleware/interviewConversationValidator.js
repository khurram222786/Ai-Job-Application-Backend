const CustomError = require("../Utils/customError");

const validateConversation = (req, res, next) => {
  const { conversation } = req.body;
  const { interviewId } = req.params;

  if (!conversation) {
    return next(new CustomError("Conversation data is required", 400));
  }

  if (!Array.isArray(conversation)) {
    return next(
      new CustomError("Conversation must be an array of messages", 400)
    );
  }

  if (conversation.length === 0) {
    return next(new CustomError("Conversation cannot be empty", 400));
  }

  for (const [index, message] of conversation.entries()) {
    if (!message || typeof message !== "object") {
      return next(
        new CustomError(`Message at index ${index} must be an object`, 400)
      );
    }
    if (!message.sender || typeof message.sender !== "string") {
      return next(
        new CustomError(
          `Message at index ${index} must have a string sender`,
          400
        )
      );
    }
    if (!["ai", "user"].includes(message.sender.toLowerCase())) {
      return next(
        new CustomError(
          `Message at index ${index}: sender must be 'ai' or 'user'`,
          400
        )
      );
    }
    if (!message.text || typeof message.text !== "string") {
      return next(
        new CustomError(
          `Message at index ${index} must have a string message`,
          400
        )
      );
    }
  }

  if (!interviewId || isNaN(interviewId)) {
    return next(new CustomError("Valid interview ID is required", 400));
  }

  next();
};

module.exports = validateConversation;
