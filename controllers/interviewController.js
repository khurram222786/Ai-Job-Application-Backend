const getUserInterviews = async (req, res) => {
    try {
      const userId = req.user.user_id;
  
      const interviews = await Interview.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Application,
            attributes: ['status', 'job_id'] // Include relevant application details
          },
          {
            model: Media,
            attributes: ['media_type', 'media_url'] // Include media details if needed
          }
        ],
        order: [['interview_date', 'ASC']] // Order by interview date (earliest first)
      });
  
      if (!interviews || interviews.length === 0) {
        return res.status(404).json({ 
          message: 'No interviews scheduled yet' 
        });
      }
  
      res.status(200).json({
        count: interviews.length,
        interviews
      });
  
    } catch (err) {
      console.error('Error fetching user interviews:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Don't forget to add it to exports
  module.exports = { 
    getUserInterviews
  };