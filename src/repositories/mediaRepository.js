const { Media } = require('../models');


module.exports = {
  findMediaByInterviewAndUser: async (interviewId, userId) => {
    return await Media.findOne({
      where: { interview_id: interviewId, user_id: userId }
    });
  },
  createMedia: async (mediaData) => {
    return await Media.create(mediaData);
  },
  updateMedia: async (media, mediaData) => {
    return await media.update(mediaData);
  }
}; 