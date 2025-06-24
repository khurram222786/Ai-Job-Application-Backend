class SessionManager {
  constructor(maxQuestions) {
    this.sessions = new Map();
    this.MAX_QUESTIONS = maxQuestions;
    this.INTERVIEW_GUIDELINES = require('./prompts').INTERVIEW_GUIDELINES;
  }

  createSession(ws) {
    const sessionId = Date.now().toString();
    const session = {
      messages: [
        {
          role: "user",
          parts: [{ text: this.INTERVIEW_GUIDELINES }],
        },
      ],
      questionCount: 0,
      isInterviewActive: false,
      candidateLevel: "mid",
      timeoutHandle: null,
      followupCount: 0,
      ws,
      resumeText: null,
      conversationContext: [],
      lastResponseAnalysis: {},
      resumeQuestions: {
        easy: [],
        medium: [],
        hard: [],
      },
      askedResumeQuestions: [],
      candidateScore: {
        technicalDepth: 0,
        experienceScore: 0,
        communicationScore: 0,
        totalScore: 0,
        responseHistory: [],
      },
    };

    this.sessions.set(sessionId, session);
    return { sessionId, session };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.timeoutHandle) {
      clearTimeout(session.timeoutHandle);
    }
    this.sessions.delete(sessionId);
  }

  shouldReferenceResume(session) {
    return session.resumeText && Math.random() < 0.6;
  }
}

module.exports = SessionManager; 