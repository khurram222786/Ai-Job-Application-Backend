const Joi = require('joi');
const CustomError = require('../Utils/customError');

const messageSchema = Joi.object({
  sender: Joi.string().valid('ai', 'user').required(),
  message: Joi.string().required()
});

exports.validateConversation = (req, res, next) => {
  const { conversation } = req.body;

  if (!Array.isArray(conversation)) {
    return res.error('Conversation must be an array', 400);
  }

  for (const [index, message] of conversation.entries()) {
    const { error } = messageSchema.validate(message);
    if (error) {
      return res.error(`Message at index ${index} is invalid: ${error.details[0].message}`, 400);
    }
  }

  next();
};