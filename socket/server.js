const { WebSocketServer } = require('ws');
const fetch = require('node-fetch');
const parseResume = require('./../validators/pdf_parser');

class InterviewWebSocketService {
  constructor(server) {
    this.PORT = process.env.WS_PORT || 3001;
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    this.MODEL_NAME = 'gemini-1.5-flash';
    this.API_URL = `https://generativelanguage.googleapis.com/v1/models/${this.MODEL_NAME}:generateContent?key=${this.GEMINI_API_KEY}`;
    this.MAX_QUESTIONS = 5;
    this.sessions = new Map();
    
    this.INTERVIEW_GUIDELINES = `You are Alex Carter, a senior technical recruiter at keepcodein. Conduct a screening interview with a candidate.

Guidelines:
1. Speak naturally and conversationally, like a human interviewer
2. Keep responses under 3 sentences - be concise but friendly
3. Use natural acknowledgments like "I see", "That's interesting", or "Great point"
4. For placeholders, use realistic details (e.g., "keepcodein" instead of [company])
5. Ask clear, focused questions one at a time
6. Show genuine interest in responses with brief follow-ups when appropriate
7. Maintain professional but warm tone throughout
8. If the user asks to repeat the question, repeat it again in a rephrased version
9. Personalize questions based on the candidate's resume when possible
10. Focus on their specific skills, experiences, and projects mentioned in their resume
11. Occasionally show subtle, professional humor when appropriate
12. Adapt questions based on the candidate's apparent experience level
13. Mix technical and behavioral questions naturally

Example GOOD questions:
"I noticed you worked with React at your last position. What did you enjoy most about that?"
"Tell me about a time you had to debug a complex issue."
"How would you approach designing a scalable API?"

Example BAD questions:
"Building on your experience with [technology], how would you [do something]?" 
"Please elaborate on your utilization of [skill] in [context]."


Interview flow:
- Start with a friendly introduction
- Ask ${this.MAX_QUESTIONS} total questions (mix of technical and behavioral)
- End with clear next steps

Important: Never reveal you're an AI. Present yourself as a human recruiter.`;

    this.wss = new WebSocketServer({ server });
    this.userRepository = require('../repositories/userRepository');
    this.interviewRepository = require('../repositories/interviewRepository');
    this.applicationRepository = require('../repositories/applicationRepository');
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      const sessionId = Date.now().toString();

      this.sessions.set(sessionId, {
        messages: [{
          role: 'user',
          parts: [{ text: this.INTERVIEW_GUIDELINES }]
        }],
        questionCount: 0,
        isInterviewActive: false,
        candidateLevel: 'mid',
        timeoutHandle: null,
        followupCount: 0,
        ws,
        resumeText: null,
        conversationContext: [],
        lastResponseAnalysis: {}
      });

      this.setupMessageHandlers(ws, sessionId);
    });
  }

  setupMessageHandlers(ws, sessionId) {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        const session = this.sessions.get(sessionId);

        if (data.type === 'user_info') {
          const validation = await this.validateUserSession(data.userId);
          
          if (!validation.isValid) {
            ws.send(JSON.stringify({
              type: 'error',
              text: validation.error
            }));
            ws.close();
            return;
          }

          session.userId = data.userId;
          session.applicationId = validation.application.id;
          session.interviewId = validation.interview.id;
          
          console.log(`Validated session for userId: ${data.userId}`);
          session.resumeText = await parseResume(session.userId);
          if (session.resumeText) {
            session.messages.push({
              role: 'user',
              parts: [{
                text: `Candidate's resume content for reference:\n${session.resumeText}\n\nUse this information to personalize your questions when appropriate.`
              }]
            });
          }
          
          ws.send(JSON.stringify({
            type: 'user_info_ack',
            status: 'success',
            message: 'User session validated successfully'
          }));
        } 
        else if (data.type === 'start_interview') {
          await this.handleInterviewStart(session);
        } 
        else if (data.type === 'message' && session.isInterviewActive) {
          await this.handleCandidateMessage(data, session);
        }
      } catch (error) {
        console.error('Error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          text: 'Apologies, I encountered a technical difficulty. Could you please repeat your last response?'
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      const session = this.sessions.get(sessionId);
      if (session?.timeoutHandle) clearTimeout(session.timeoutHandle);
      this.sessions.delete(sessionId);
    });
  }

  async handleInterviewStart(session) {
    session.isInterviewActive = true;
    session.followupCount = 0;

    let introPrompt = ``;
  
    if (session.resumeText) {
      introPrompt = `Start with a warm 2-sentence introduction. Example: "Hi there! I'm Alex from keepcodein. Thanks for taking the time to speak with me today." 
      Then ask one opening question that references something from their resume. For example, if they mention a specific technology or project, ask about that. 
      Keep the question to 1 sentence.`;
    }

    session.messages.push({
      role: 'user',
      parts: [{ text: introPrompt }]
    });

    console.log("session.messages --->", JSON.stringify(session.messages, null, 2))

    const responseText = await this.callGeminiAPI(session.messages, 0.7);
    session.messages.push({
      role: 'model',
      parts: [{ text: responseText }]
    });

    session.ws.send(JSON.stringify({
      type: 'response',
      text: responseText,
      isFirstQuestion: true
    }));

    this.setNextQuestionTimeout(session);
  }

  async handleCandidateMessage(data, session) {
    session.followupCount = 0;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    // Analyze the response
    const analysis = await this.analyzeCandidateResponse(data.text, session);
    console.log("analysis test --->", analysis)
    session.lastResponseAnalysis = analysis;
    session.candidateLevel = this.determineCandidateLevel(analysis, session.candidateLevel);
    
    // Store conversation context
    session.conversationContext.push({
      question: session.messages[session.messages.length - 1].parts[0].text,
      response: data.text,
      analysis: analysis
    });

    session.messages.push({
      role: 'user',
      parts: [{ text: data.text }]
    });

    // Acknowledge the response (70% chance)
    if (Math.random() < 0.5) {
      const acknowledgment = await this.generateAcknowledgment(session);
      if (acknowledgment) {
        session.messages.push({
          role: 'model',
          parts: [{ text: acknowledgment }]
        });

        session.ws.send(JSON.stringify({
          type: 'response',
          text: acknowledgment,
          isAcknowledgment: true
        }));
      }
    }

    if (session.questionCount >= this.MAX_QUESTIONS) {
      await this.concludeInterview(session);
      return;
    }

    // Ask follow-up question (30-70% chaqqnce)
    if (this.shouldAskFollowUp(session)) {
      const followUpQuestion = await this.generateFollowUpQuestion(session);
      if (followUpQuestion) {
        session.messages.push({
          role: 'model',
          parts: [{ text: followUpQuestion }]
        });

        session.ws.send(JSON.stringify({
          type: 'response',
          text: followUpQuestion,
          isFollowUp: true
        }));

        this.setNextQuestionTimeout(session);
        return;
      }
    }

    session.questionCount++;
    const nextQuestion = await this.generateNextQuestion(session);
    session.messages.push({
      role: 'model',
      parts: [{ text: nextQuestion }]
    });

    session.ws.send(JSON.stringify({
      type: 'response',
      text: nextQuestion,
      questionCount: session.questionCount
    }));

    this.setNextQuestionTimeout(session);
  }

  async analyzeCandidateResponse(responseText, session) {
  const analysisPrompt = {
    role: 'user',
    parts: [{
      text: `Analyze this candidate response and return a plain JSON object without markdown formatting or additional text:
      1. technicalDepth (1-5)
      2. experienceIndicators (array of strings like 'junior', 'mid', 'senior')
      3. keyPoints (array of strings)
      4. interestingAspects (array of strings)
      5. wordCount (number)
      6. sentiment ('positive', 'neutral', or 'negative')
      7. humorPotential (boolean)
      
      Response to analyze: "${responseText}"
      
      Return ONLY the JSON object with no additional text or formatting. Example:
      {"technicalDepth":3,"experienceIndicators":["mid"],"keyPoints":["React experience"],"interestingAspects":[],"wordCount":42,"sentiment":"positive","humorPotential":false}`
    }]
  };

  try {
    const analysisText = await this.callGeminiAPI([analysisPrompt], 0.3);
    
    // Clean the response by removing markdown formatting if present
    let cleanJson = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      technicalDepth: 3,
      experienceIndicators: ['mid'],
      keyPoints: [],
      interestingAspects: [],
      wordCount: responseText.split(' ').length,
      sentiment: 'neutral',
      humorPotential: false
    };
  }
}

  determineCandidateLevel(analysis, currentLevel) {
    const { technicalDepth, experienceIndicators, wordCount } = analysis;
    
    let levelScore = 0;
    levelScore += technicalDepth;
    
    if (experienceIndicators.includes('senior')) levelScore += 2;
    if (experienceIndicators.includes('mid')) levelScore += 1;
    if (experienceIndicators.includes('junior')) levelScore -= 2;
    
    
    if (levelScore >= 6 && currentLevel !== 'senior') return 'senior';
    if (levelScore >= 4 && currentLevel !== 'mid') return 'mid';
    if (levelScore <= 3 && currentLevel !== 'junior') return 'junior';
    
    return currentLevel;
  }

  shouldAskFollowUp(session) {
    if (session.questionCount < 2 || session.questionCount >= this.MAX_QUESTIONS - 2) {
      return false;
    }
    
    const interestingAspects = session.lastResponseAnalysis?.interestingAspects?.length || 0;
    const baseProbability = 0.3;
    const followUpProbability = baseProbability + (interestingAspects * 0.15);
    
    return Math.random() < Math.min(followUpProbability, 0.7);
  }

  async generateFollowUpQuestion(session) {
    const { interestingAspects, keyPoints } = session.lastResponseAnalysis;
    
    const followUpPrompt = {
      role: 'user',
      parts: [{
        text: `Ask one follow-up question based on the candidate's last response.
        Interesting aspects they mentioned: ${interestingAspects.join(', ')}.
        Key points: ${keyPoints.join(', ')}.
        Candidate level: ${session.candidateLevel}.
        ${session.lastResponseAnalysis.humorPotential ? 'You may include subtle professional humor if appropriate.' : ''}
        Keep the question concise (1 sentence) and natural.`
      }]
    };
    
    return await this.callGeminiAPI([followUpPrompt], 0.6);
  }

  async generateAcknowledgment(session) {
    const { sentiment, keyPoints } = session.lastResponseAnalysis;
    
    if (keyPoints.length === 0) {
      return null;
    }
    
    const acknowledgmentPrompt = {
      role: 'user',
      parts: [{
        text: `Generate a brief (1 sentence) acknowledgment of the candidate's last response. 
        Key points they mentioned: ${keyPoints.join(', ')}.
        Sentiment: ${sentiment}.
        ${session.lastResponseAnalysis.humorPotential ? 'You may include subtle professional humor if appropriate.' : ''}
        Make it sound natural like a human recruiter would.`
      }]
    };
    
    return await this.callGeminiAPI([acknowledgmentPrompt], 0.5);
  }

  async generateNextQuestion(session) {
    const phase = this.getInterviewPhase(session.questionCount);
    const questionType = this.selectQuestionType(phase, session);
    
    // Get specific details from resume or previous answers
    let specificReference = '';
    if (this.shouldReferenceResume(session)) {
      specificReference = `Here's their resume content for reference: ${session.resumeText}\n`;
    }
    
    // Get last interesting point if available
    let lastInteresting = '';
    if (session.lastResponseAnalysis?.interestingAspects?.length > 0) {
      lastInteresting = `They recently mentioned: ${session.lastResponseAnalysis.interestingAspects[0]}. `;
    }
  
    const prompt = {
      role: 'user',
      parts: [{
        text: `Ask a ${questionType} question for a ${session.candidateLevel} candidate.
        ${specificReference}
        ${lastInteresting}
        The question should:
        - Be 1-2 sentences
        - Use natural, conversational language
        - Reference specific technologies/experiences they mentioned
        - Never use placeholders like [something]
        - Flow naturally from the conversation
        
        Example formats:
        "I see you worked with [technology]. What was that experience like?"
        "Tell me about a time you [relevant situation]."
        "How would you approach [relevant challenge]?"
        
        Current conversation context:
        ${session.conversationContext.slice(-3).map(c => `Q: ${c.question}\nA: ${c.response}`).join('\n\n')}`
      }]
    };
    
    return await this.callGeminiAPI([prompt], this.getTemperature(phase));
  }

  getInterviewPhase(questionCount) {
    if (questionCount <= 2) return 'warmup';
    if (questionCount < this.MAX_QUESTIONS - 2) return 'mid';
    return 'conclusion';
  }

  selectQuestionType(phase, session) {
    const types = {
      warmup: [
        'resume-based technical',
        'resume-based behavioral',
      ],
      mid: [
        `${session.candidateLevel}-level technical`,
        'behavioral',
        'problem-solving',
        'situational',
        'hypothetical scenario'
      ],
      conclusion: [
        'career goals',
        'professional development',
        'final technical reflection',
        'open-ended'
      ]
    };
    
    const weights = {
      warmup: [0.4, 0.4, 0.2],
      mid: [0.4, 0.3, 0.15, 0.1, 0.05],
      conclusion: [0.3, 0.3, 0.2, 0.2]
    };
    
    const typeIndex = this.weightedRandom(weights[phase]);
    return types[phase][typeIndex];
  }

  weightedRandom(weights) {
    const total = weights.reduce((a, b) => a + b);
    const random = Math.random() * total;
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) return i;
    }
    
    return weights.length - 1;
  }

  shouldReferenceResume(session) {
    return session.resumeText && Math.random() < 0.6;
  }

  shouldConnectToPrevious(session) {
    return session.lastResponseAnalysis?.keyPoints?.length > 0 && Math.random() < 0.5;
  }

  shouldAddHumor(session) {
    return session.lastResponseAnalysis?.humorPotential && Math.random() < 0.3;
  }

  getTemperature(phase) {
    const temps = {
      warmup: 0.7,
      mid: 0.6,
      conclusion: 0.5
    };
    return temps[phase];
  }

  setNextQuestionTimeout(session) {
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    session.timeoutHandle = setTimeout(async () => {
      if (session.followupCount >= 2) {
        await this.concludeInterview(session, true);
        return;
      }

      console.log(`User timed out — sending follow-up ${session.followupCount + 1}/2`);
      session.followupCount++;

      let followupPrompt = `The candidate didn't respond within 60 seconds (follow-up ${session.followupCount}/2). `;
      
      if (session.followupCount === 1) {
        followupPrompt += `Please ask a follow-up question to re-engage them. `;
        if (session.resumeText) {
          followupPrompt += `Try to reference something from their resume if appropriate. ${session.resumeText}`;
        }
      } else {
        followupPrompt += `Please ask one final follow-up question before concluding.`;
      }

      session.messages.push({
        role: 'user',
        parts: [{ text: followupPrompt }]
      });

      const responseText = await this.callGeminiAPI(session.messages, 0.5);
      session.messages.push({
        role: 'model',
        parts: [{ text: responseText }]
      });

      session.questionCount++;

      session.ws.send(JSON.stringify({
        type: 'response',
        text: responseText,
        questionCount: session.questionCount,
        isFollowup: true,
        followupCount: session.followupCount
      }));

      if (session.questionCount >= this.MAX_QUESTIONS) {
        await this.concludeInterview(session);
      } else {
        this.setNextQuestionTimeout(session);
      }
    }, 600000);
  }

  async concludeInterview(session, isTimeoutConclusion = false) {
    const conclusionPrompt = {
      role: 'user',
      parts: [{
        text: isTimeoutConclusion ?
          `The candidate didn't respond to multiple follow-ups. 
           Please conclude the interview professionally by thanking them 
           for their time and mentioning that we'll be in touch if 
           there's interest in proceeding. Keep it brief (1-2 sentences).` :
          `Please conclude the interview professionally. 
           Thank the candidate for their time, mention next steps 
           (like "We'll review your answers and get back to you"), 
           and wish them a good day. Keep it under 3 sentences.`
      }]
    };

    session.messages.push(conclusionPrompt);
    const closingText = await this.callGeminiAPI(session.messages);
    session.messages.push({
      role: 'model',
      parts: [{ text: closingText }]
    });

    session.ws.send(JSON.stringify({
      type: 'response',
      text: closingText,
      isConclusion: true
    }));

    session.isInterviewActive = false;
    setTimeout(() => session.ws.close(), 1000);
  }

  async callGeminiAPI(messages, temperature = 0.5) {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 300,
            topP: 0.9
          }
        }),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  async validateUserSession(userId) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const applications = await this.applicationRepository.getUserApplications(userId);
      if (!applications || applications.length === 0) {
        throw new Error('No active applications found');
      }

      const interviews = await this.interviewRepository.getUserInterviews(userId);
      const scheduledInterview = interviews.find(interview => {
        const interviewDate = new Date(interview.interview_date);
        const now = new Date();
        return interviewDate >= now;
      });

      if (!scheduledInterview) {
        throw new Error('No scheduled interview found');
      }

      return {
        isValid: true,
        user,
        application: applications[0],
        interview: scheduledInterview
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = InterviewWebSocketService;