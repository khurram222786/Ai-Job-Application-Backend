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
4. For placeholders, use realistic details (e.g., "keepcodein " instead of [company])
5. Ask clear, focused questions one at a time
6. Show genuine interest in responses with brief follow-ups when appropriate
7. Maintain professional but warm tone throughout
8. If the user asks to repeat the question, repeat it again in a rephrased version
9. Personalize questions based on the candidate's resume when possible
10. Focus on their specific skills, experiences, and projects mentioned in their resume

Interview flow:
- Start with a friendly introduction
- Ask ${this.MAX_QUESTIONS} total questions
- End with clear next steps

Important: Never reveal you're an AI. Present yourself as a human recruiter.`;

    this.wss = new WebSocketServer({ server });
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
        ws, // Store the WebSocket connection
        resumeText: null // Store parsed resume text
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
          session.userId = data.userId;
          console.log(`Received user info for userId:----> ${data.userId}`);
          session.resumeText = await parseResume(session.userId);
          console.log("resume text-->", session.resumeText);
          
          // Add resume context to the initial messages
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
            message: 'User ID received'
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

    let introPrompt = `Start with a warm 2-sentence introduction. Example: "Hi there! I'm Alex from keepcodein. Thanks for taking the time to speak with me today." Then ask one opening question about their background in 1 sentence.`;
    
    // If we have resume text, modify the intro to reference it
    if (session.resumeText) {
      introPrompt = `Start with a warm 2-sentence introduction. Example: "Hi there! I'm Alex from keepcodein. Thanks for taking the time to speak with me today." 
      Then ask one opening question that references something from their resume. For example, if they mention a specific technology or project, ask about that. 
      Keep the question to 1 sentence.`;
    }

    session.messages.push({
      role: 'user',
      parts: [{ text: introPrompt }]
    });

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

    session.questionCount++;
    session.messages.push({
      role: 'user',
      parts: [{ text: data.text }]
    });

    // Determine candidate level based on response length and content
    if (data.text.length > 200) {
      session.candidateLevel = 'senior';
    } else if (data.text.length < 50) {
      session.candidateLevel = 'junior';
    }

    if (session.questionCount >= this.MAX_QUESTIONS) {
      await this.concludeInterview(session);
      return;
    }

    this.setNextQuestionTimeout(session);

    const nextPrompt = this.generateNextPrompt(session);
    session.messages.push({
      role: 'user',
      parts: [{ text: nextPrompt }]
    });

    const temperature = session.questionCount < 2 ? 0.7 :
                      session.questionCount > this.MAX_QUESTIONS - 2 ? 0.6 : 0.5;

    const responseText = await this.callGeminiAPI(session.messages, temperature);
    session.messages.push({
      role: 'model',
      parts: [{ text: responseText }]
    });

    session.ws.send(JSON.stringify({
      type: 'response',
      text: responseText,
      questionCount: session.questionCount
    }));

    this.setNextQuestionTimeout(session);
  }

  generateNextPrompt(session) {
    let prompt = '';
    
    if (session.questionCount < 2) {
      // Early questions - focus on resume-based warm-up
      if (session.resumeText) {
        prompt = `Ask a question that references something specific from their resume (like a technology, project, or experience they mentioned). 
                 This should be a relatively easy warm-up question but personalized to their background. 
                 Example: "I see you worked with [technology] at [company] - can you tell me about your experience with that?"`;
      } else {
        prompt = `Ask another relatively easy question to continue warming up. 
                You can make it slightly more technical than the first.`;
      }
    } else if (session.questionCount < 5) {
      // Mid-interview questions - technical but can still reference resume
      if (session.resumeText) {
        prompt = `Based on the candidate's apparent level (${session.candidateLevel}) and their resume content, 
                ask a moderately technical question that relates to their experience. 
                You could ask about a specific technology they've used, a project they worked on, or how they would approach a problem relevant to their background. 
                After their answer, provide brief acknowledgment before moving on.`;
      } else {
        prompt = `Based on the candidate's apparent level (${session.candidateLevel}), 
                ask a moderately technical question about ${this.getTechnicalTopic(session.questionCount)}. 
                After their answer, provide brief acknowledgment before moving on.`;
      }
    } else {
      // Final questions - more challenging or open-ended
      if (session.resumeText) {
        prompt = `Ask ${session.questionCount < this.MAX_QUESTIONS - 1 ? 
                'a more challenging technical question that relates to their resume content' : 
                'a final open-ended question about their experience, career goals, or how a specific project from their resume helped them grow professionally'}. 
                Make it appropriate for a ${session.candidateLevel} candidate but personalized to their background.`;
      } else {
        prompt = `Ask ${session.questionCount < this.MAX_QUESTIONS - 1 ? 
                'a more challenging technical question' : 
                'a final open-ended question about their experience or problem-solving approach'}. 
                Make it appropriate for a ${session.candidateLevel} candidate.`;
      }
    }
    
    return prompt;
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
          followupPrompt += `Try to reference something from their resume if appropriate.`;
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
    }, 60000); // 60 seconds
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

  getTechnicalTopic(index) {
    const topics = [
      'programming fundamentals',
      'data structures',
      'algorithms',
      'system design principles',
      'software architecture',
      'debugging techniques',
      'performance optimization',
      'testing methodologies'
    ];
    return topics[index % topics.length];
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
}

module.exports = InterviewWebSocketService;