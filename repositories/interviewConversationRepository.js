const { InterviewConversation } = require('../models');

module.exports = {
  async findConversationByInterviewId(interviewId) {
    return await InterviewConversation.findOne({
      where: { interview_id: interviewId }
    });
  },

  async createConversation(interviewId, conversationData) {
    return await InterviewConversation.create({
      interview_id: interviewId,
      conversation: conversationData
    });
  },

  async updateConversation(conversationRecord, newConversationData) {
    return await conversationRecord.update({
      conversation: newConversationData
    });
  }
};