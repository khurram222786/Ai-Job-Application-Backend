const { WebSocketServer } = require("ws");
const fetch = require("node-fetch");
const parseResume = require("./../validators/pdf_parser");
const documentRepository = require("../repositories/documentRepository");
const SessionManager = require("./sessionManager");
const AIService = require("./aiService");
const InterviewEngine = require("./interviewEngine");
const InterviewUtils = require("./utils");
const prompt= require('./prompts')

class InterviewWebSocketService {
  constructor(server) {
    this.MAX_QUESTIONS = 5;
    this.wss = new WebSocketServer({ server });
    this.sessionManager = new SessionManager(this.MAX_QUESTIONS);
    this.aiService = new AIService(
      process.env.GEMINI_API_KEY,
      "gemini-1.5-flash"
    );
    this.interviewEngine = new InterviewEngine(this.MAX_QUESTIONS);
    this.userRepository = require("../repositories/userRepository");
    this.interviewRepository = require("../repositories/interviewRepository");
    this.applicationRepository = require("../repositories/applicationRepository");
    this.initialize();
  }

  initialize() {
    this.wss.on("connection", (ws) => {
      console.log("New client connected");
      const { sessionId, session } = this.sessionManager.createSession(ws);
      this.setupMessageHandlers(ws, sessionId);
    });
  }

  setupMessageHandlers(ws, sessionId) {
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        const session = this.sessionManager.getSession(sessionId);

        if (data.type === "user_info") {
          await this.handleUserInfo(data, session);
        } else if (data.type === "start_interview") {
          await this.handleInterviewStart(session);
        } else if (data.type === "message" && session.isInterviewActive) {
          await this.handleCandidateMessage(data, session);
        }
      } catch (error) {
        console.error("Error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            text: "Apologies, I encountered a technical difficulty. Could you please repeat your last response?",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      this.sessionManager.deleteSession(sessionId);
    });
  }

  async handleUserInfo(data, session) {
    const validation = await this.validateUserSession(
      data.userId,
      data.interviewId
    );

    if (!validation.isValid) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          text: validation.error,
        })
      );
      session.ws.close();
      return;
    }

    session.userId = data.userId;
    session.applicationId = validation.application.id;
    session.interviewId = data.interviewId;

    const document = await documentRepository.findDocumentByUserId(session.userId);
    session.resumeText = JSON.stringify(document.parsed_data, null, 2);

    if (session.resumeText) {
      session.messages.push({
        role: "user",
        parts: [
          {
            text: `Candidate's resume content for reference:\n${session.resumeText}\n\nUse this information to personalize your questions when appropriate.`,
          },
        ],
      });
    }

    session.ws.send(
      JSON.stringify({
        type: "user_info_ack",
        status: "success",
        message: "User session validated successfully",
      })
    );
  }

  async handleInterviewStart(session) {
    session.isInterviewActive = true;
    session.followupCount = 0;
    session.askedResumeQuestions = [];

    await this.interviewRepository.updateInterviewProgress(
      session.interviewId,
      "inprogress"
    );

    if (session.resumeText) {
      await this.generateResumeQuestions(session);
    }

    const introPrompt = session.resumeText ? prompt.INTRO_PROMPT : '';
    
    if (introPrompt) {
      session.messages.push({
        role: "user",
        parts: [{ text: introPrompt }],
      });

      const responseText = await this.aiService.callGeminiAPI(session.messages, 0.7);
      session.messages.push({
        role: "model",
        parts: [{ text: responseText }],
      });

      session.ws.send(
        JSON.stringify({
          type: "response",
          text: responseText,
          isFirstQuestion: true,
        })
      );
    }

    this.setNextQuestionTimeout(session);
  }

  async handleCandidateMessage(data, session) {
    session.followupCount = 0;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    const analysis = await this.analyzeCandidateResponse(data.text, session);
    session.lastResponseAnalysis = analysis;

    session.candidateLevel = this.interviewEngine.determineCandidateLevel(
      analysis,
      session
    );

    session.conversationContext.push({
      question: session.messages[session.messages.length - 1].parts[0].text,
      response: data.text,
      analysis: analysis,
    });

    session.messages.push({
      role: "user",
      parts: [{ text: data.text }],
    });

    if (Math.random() < 0.7) {
      const acknowledgment = await this.aiService.generateAcknowledgment(session);
      if (acknowledgment) {
        session.messages.push({
          role: "model",
          parts: [{ text: acknowledgment }],
        });

        session.ws.send(
          JSON.stringify({
            type: "response",
            text: acknowledgment,
            isAcknowledgment: true,
          })
        );
      }
    }

    if (session.questionCount >= this.MAX_QUESTIONS) {
      await this.concludeInterview(session);
      return;
    }

    if (this.interviewEngine.shouldAskFollowUp(session)) {
      console.log("followup check")
      const followUpQuestion = await this.aiService.generateFollowUpQuestion(
        session
      );
      if (followUpQuestion) {
        session.messages.push({
          role: "model",
          parts: [{ text: followUpQuestion }],
        });

        session.ws.send(
          JSON.stringify({
            type: "response",
            text: followUpQuestion,
            isFollowUp: true,
          })
        );

        this.setNextQuestionTimeout(session);
        return;
      }
    }

    session.questionCount++;
    const phase = InterviewUtils.getInterviewPhase(
      session.questionCount,
      this.MAX_QUESTIONS
    );
    const nextQuestionType = this.interviewEngine.selectQuestionType(
      phase,
      session
    );
    console.log("next_Question_Type=========>",nextQuestionType)
    const nextQuestion = await this.generateNextQuestion(nextQuestionType, session);

    session.messages.push({
      role: "model",
      parts: [{ text: nextQuestion }],
    });

    session.ws.send(
      JSON.stringify({
        type: "response",
        text: nextQuestion,
        questionCount: session.questionCount,
      })
    );

    this.setNextQuestionTimeout(session);
  }

  async generateResumeQuestions(session) {
    try {
      const resumePromptText = prompt.RESUME_QUESTION_PROMPT(session.resumeText);
      const resumePrompt = {
        role: "user",
        parts: [
          {
            text: resumePromptText,
          },
        ],
      };

      const response = await this.aiService.callGeminiAPI([resumePrompt], 0.1);
      let cleanResponse = response.trim();

      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.substring(7);
      }
      if (cleanResponse.endsWith("```")) {
        cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
      }
      cleanResponse = cleanResponse.trim();

      const questions = JSON.parse(cleanResponse);
      if (!questions.easy || !questions.medium || !questions.hard) {
        throw new Error("Missing required difficulty levels");
      }

      ["easy", "medium", "hard"].forEach((difficulty) => {
        if (!Array.isArray(questions[difficulty])) {
          throw new Error(`${difficulty} questions must be an array`);
        }
        if (questions[difficulty].length !== 5) {
          throw new Error(`${difficulty} must have exactly 5 questions`);
        }
      });

      console.log("resume based questions----> EASY", questions.easy);
      console.log("resume based questions----> medium ", questions.medium);
      console.log("resume based questions----> hard", questions.hard);
      // Store questions in the session
      session.resumeQuestions = {
        easy: questions.easy,
        medium: questions.medium,
        hard: questions.hard,
      };

      console.log("Successfully generated resume questions");
    } catch (error) {
      console.error("Error generating resume questions:", error);
      console.log("Using fallback resume questions");
    }
  }

  async analyzeCandidateResponse(responseText, session) {
    const analysisPrompt = {
      role: "user",
      parts: [
        {
          text: prompt.RESPONSE_ANALYSIS_PROMPT(responseText),
        },
      ],
    };

    try {
      const analysisText = await this.aiService.callGeminiAPI([analysisPrompt], 0.3);

      let cleanJson = analysisText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      console.log("test analysis-->", cleanJson);

      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Analysis failed:", error);
      return {
        technicalDepth: 0,
        experienceIndicators: ["junior"],
        keyPoints: [],
        interestingAspects: [],
        wordCount: responseText.split(" ").length,
        sentiment: "neutral",
        humorPotential: false,
      };
    }
  }

  async generateNextQuestion(questionType, session) {
    let specificReference = "";
    if (this.sessionManager.shouldReferenceResume(session)) {
      specificReference = `Here's their resume content for reference: ${session.resumeText}\n`;
    }

    let lastInteresting = "";
    if (session.lastResponseAnalysis?.interestingAspects?.length > 0) {
      lastInteresting = `They recently mentioned: ${session.lastResponseAnalysis.interestingAspects[0]}. `;
    }
    const prompt = {
      role: "user",
      parts: [
        {
          text: `Ask a ${questionType} question for a ${
            session.candidateLevel
          } candidate.
        ${specificReference}
        ${lastInteresting}
        The question should:
        - Be 1-2 sentences
        - Use natural, conversational language
        - Reference specific technologies/experiences they mentioned
        - Never use placeholders like [something]
        - Flow naturally from the conversation
        
        Current conversation context:
        ${session.conversationContext
          .slice(-3)
          .map((c) => `Q: ${c.question}\nA: ${c.response}`)
          .join("\n\n")}`,
        },
      ],
    };

    console.log(
      "<==========================Next Question Prompt===============================================>",
      prompt
    );

    return await this.aiService.callGeminiAPI(
      [prompt],
      InterviewUtils.getTemperature(
        InterviewUtils.getInterviewPhase(session.questionCount, this.MAX_QUESTIONS)
      )
    );
  }

  setNextQuestionTimeout(session) {
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    session.timeoutHandle = setTimeout(async () => {
      if (session.followupCount >= 2) {
        await this.concludeInterview(session, true);
        return;
      }
      console.log(
        `User timed out — sending follow-up ${session.followupCount + 1}/2`
      );
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
        role: "user",
        parts: [{ text: followupPrompt }],
      });

      const responseText = await this.aiService.callGeminiAPI(session.messages, 0.5);
      session.messages.push({
        role: "model",
        parts: [{ text: responseText }],
      });

      session.questionCount++;

      session.ws.send(
        JSON.stringify({
          type: "response",
          text: responseText,
          questionCount: session.questionCount,
          isFollowup: true,
          followupCount: session.followupCount,
        })
      );

      if (session.questionCount >= this.MAX_QUESTIONS) {
        await this.concludeInterview(session);
      } else {
        this.setNextQuestionTimeout(session);
      }
    }, 300000);
  }

  async concludeInterview(session, isTimeoutConclusion = false) {
    const conclusionText = prompt.CONCLUSION_PROMPT(isTimeoutConclusion);
    const conclusionPrompt = {
      role: "user",
      parts: [
        {
          text: conclusionText,
        },
      ],
    };

    session.messages.push(conclusionPrompt);
    const closingText = await this.aiService.callGeminiAPI(session.messages);
    session.messages.push({
      role: "model",
      parts: [{ text: closingText }],
    });

    session.ws.send(
      JSON.stringify({
        type: "response",
        text: closingText,
        isConclusion: true,
      })
    );

    session.isInterviewActive = false;
    await this.interviewRepository.updateInterviewProgress(
      session.interviewId,
      "completed"
    );
    setTimeout(() => session.ws.close(), 1000);
  }

  async validateUserSession(userId, interviewId) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const applications = await this.applicationRepository.getUserApplications(
        userId
      );
      if (!applications || applications.length === 0) {
        throw new Error("No active applications found");
      }

      const interview = await this.interviewRepository.findInterviewById(
        interviewId
      );
      if (!interview) {
        throw new Error("Interview not found");
      }

      return {
        isValid: true,
        user,
        application: applications[0],
        interview,
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }
}

module.exports = InterviewWebSocketService;
