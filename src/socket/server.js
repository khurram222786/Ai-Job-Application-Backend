const { WebSocketServer } = require("ws");
const fetch = require("node-fetch");
const parseResume = require("./../validators/pdf_parser");
const prompt = require("./prompts");
const { callGemini } = require("../validators/geminiHook");
const documentRepository = require("../repositories/documentRepository");

class InterviewWebSocketService {
  constructor(server) {
    this.PORT = process.env.WS_PORT || 3001;
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    this.MODEL_NAME = "gemini-1.5-flash";
    this.API_URL = `https://generativelanguage.googleapis.com/v1/models/${this.MODEL_NAME}:generateContent?key=${this.GEMINI_API_KEY}`;
    this.MAX_QUESTIONS = 5;
    this.sessions = new Map();
    this.RESUME_QUESTION_RATIO = 0.3;
    this.INTERVIEW_GUIDELINES = prompt.INTERVIEW_GUIDELINES;
    this.wss = new WebSocketServer({ server });
    this.userRepository = require("../repositories/userRepository");
    this.interviewRepository = require("../repositories/interviewRepository");
    this.applicationRepository = require("../repositories/applicationRepository");
    this.initialize();
  }

  initialize() {
    this.wss.on("connection", (ws) => {
      console.log("New client connected");
      const sessionId = Date.now().toString();

      this.sessions.set(sessionId, {
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
      });

      this.setupMessageHandlers(ws, sessionId);
    });
  }

  setupMessageHandlers(ws, sessionId) {
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        const session = this.sessions.get(sessionId);

        if (data.type === "user_info") {
          const validation = await this.validateUserSession(
            data.userId,
            data.interviewId
          );

          if (!validation.isValid) {
            ws.send(
              JSON.stringify({
                type: "error",
                text: validation.error,
              })
            );
            ws.close();
            return;
          }

          session.userId = data.userId;
          session.applicationId = validation.application.id;
          session.interviewId = data.interviewId;

          console.log(
            `Validated session for userId: ${data.userId}, interviewId: ${data.interviewId}`
          );
          // session.resumeText = await parseResume(session.userId);
          const document = await documentRepository.findDocumentByUserId(
            session.userId
          );
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

          ws.send(
            JSON.stringify({
              type: "user_info_ack",
              status: "success",
              message: "User session validated successfully",
            })
          );
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
      const session = this.sessions.get(sessionId);
      if (session?.timeoutHandle) clearTimeout(session.timeoutHandle);
      this.sessions.delete(sessionId);
    });
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

    let introPrompt = ``;
    if (session.resumeText) {
      introPrompt = prompt.INTRO_PROMPT;
    }

    session.messages.push({
      role: "user",
      parts: [{ text: introPrompt }],
    });

    const responseText = await this.callGeminiAPI(session.messages, 0.7);
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

      const response = await this.callGeminiAPI([resumePrompt], 0.1);
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

  getResumeQuestion(session) {
    let difficulty;
    switch (session.candidateLevel) {
      case "senior":
        difficulty =
          Math.random() < 0.6
            ? "hard"
            : Math.random() < 0.8
            ? "medium"
            : "easy";
        break;
      case "mid":
        difficulty =
          Math.random() < 0.6
            ? "medium"
            : Math.random() < 0.8
            ? "easy"
            : "hard";
        break;
      default: // junior
        difficulty =
          Math.random() < 0.6
            ? "easy"
            : Math.random() < 0.8
            ? "medium"
            : "hard";
    }

    const availableQuestions = session.resumeQuestions[difficulty].filter(
      (q) => !session.askedResumeQuestions.includes(q)
    );
    if (availableQuestions.length === 0) {
      return null;
    }
    const question =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    session.askedResumeQuestions.push(question);

    return question;
  }

  async handleCandidateMessage(data, session) {
    session.followupCount = 0;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    const analysis = await this.analyzeCandidateResponse(data.text, session);
    session.lastResponseAnalysis = analysis;

    session.candidateLevel = this.determineCandidateLevel(analysis, session);

    session.conversationContext.push({
      question: session.messages[session.messages.length - 1].parts[0].text,
      response: data.text,
      analysis: analysis,
    });

    session.messages.push({
      role: "user",
      parts: [{ text: data.text }],
    });

    // Acknowledge the response (80% chance)
    if (Math.random() < 0.8) {
      const acknowledgment = await this.generateAcknowledgment(session);
      console.log("test acknowlegement--->", acknowledgment);
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

    if (this.shouldAskFollowUp(session)) {
      const followUpQuestion = await this.generateFollowUpQuestion(session);
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
    const nextQuestion = await this.generateNextQuestion(session);
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

  async generateNextQuestion(session) {
    const phase = this.getInterviewPhase(session.questionCount);
    const questionType = this.selectQuestionType(phase, session);

    console.log("question type---->", questionType);
    const useResumeQuestion = Math.random() < this.RESUME_QUESTION_RATIO;

    if (useResumeQuestion) {
      const resumeQuestion = this.getResumeQuestion(session);
      if (resumeQuestion) {
        return resumeQuestion;
      }
    }

    let specificReference = "";
    if (this.shouldReferenceResume(session)) {
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
      "<==========================next questionprompt===============================================>",
      prompt
    );

    return await this.callGeminiAPI([prompt], this.getTemperature(phase));
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
      const analysisText = await this.callGeminiAPI([analysisPrompt], 0.3);

      // Clean the response by removing markdown formatting if present
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

  determineCandidateLevel(analysis, session) {
    const { technicalDepth, experienceIndicators, wordCount, sentiment } =
      analysis;

    const progressFactor = session.questionCount / this.MAX_QUESTIONS;

    const technicalWeight = 0.45;
    const normalizedTechnicalDepth = (technicalDepth / 5) * 5; // Normalize to 0-5 scale
    session.candidateScore.technicalDepth =
      session.candidateScore.technicalDepth * (1 - technicalWeight) +
      normalizedTechnicalDepth * technicalWeight;

    let experienceScore = 0;
    if (experienceIndicators.includes("senior")) experienceScore += 4;
    if (experienceIndicators.includes("mid")) experienceScore += 2;
    if (experienceIndicators.includes("junior")) experienceScore += 0;

    const experienceWeight = 0.3;
    session.candidateScore.experienceScore =
      session.candidateScore.experienceScore * (1 - experienceWeight) +
      experienceScore * experienceWeight;

    // Calculate communication score with higher range
    const communicationScore =
      Math.min(wordCount / 30, 1) * 3 +
      (sentiment === "positive" ? 2 : sentiment === "neutral" ? 1 : 0);

    const communicationWeight = 0.3;
    session.candidateScore.communicationScore =
      session.candidateScore.communicationScore * (1 - communicationWeight) +
      communicationScore * communicationWeight;

    // Calculate total score with adjusted weights
    session.candidateScore.totalScore =
      session.candidateScore.technicalDepth * 0.5 +
      session.candidateScore.experienceScore * 0.3 +
      session.candidateScore.communicationScore * 0.2;

    // Store response history
    session.candidateScore.responseHistory.push({
      questionNumber: session.questionCount,
      analysis,
      scores: {
        technicalDepth: session.candidateScore.technicalDepth,
        experienceScore: session.candidateScore.experienceScore,
        communicationScore: session.candidateScore.communicationScore,
        totalScore: session.candidateScore.totalScore,
      },
    });

    const seniorThreshold = 3.0 + 0.7 * progressFactor; // 3.0-3.7 range
    const midThreshold = 1.5 + 0.5 * progressFactor; // 1.5-2.0 range

    let newLevel = session.candidateLevel;

    console.log("senior threshold---->", seniorThreshold);
    console.log("mid threshold---->", midThreshold);
    console.log("total score---->", session.candidateScore.totalScore);

    if (session.candidateScore.totalScore >= seniorThreshold) {
      newLevel = "senior";
    } else if (session.candidateScore.totalScore >= midThreshold) {
      newLevel = "mid";
    } else {
      newLevel = "junior";
    }

    if (newLevel !== session.candidateLevel) {
      console.log(
        `Candidate level changed from ${session.candidateLevel} to ${newLevel}`
      );
      console.log(`Current scores:`, session.candidateScore);
    }

    return newLevel;
  }

  shouldAskFollowUp(session) {
    if (
      session.questionCount < 2 ||
      session.questionCount >= this.MAX_QUESTIONS - 2
    ) {
      return false;
    }

    const interestingAspects =
      session.lastResponseAnalysis?.interestingAspects?.length || 0;
    const baseProbability = 0.3;
    const followUpProbability = baseProbability + interestingAspects * 0.15;

    return Math.random() < Math.min(followUpProbability, 0.7);
  }

  async generateFollowUpQuestion(session) {
    const { interestingAspects, keyPoints } = session.lastResponseAnalysis;

    const followUpPrompt = {
      role: "user",
      parts: [
        {
          text: `Ask one follow-up question based on the candidate's last response.
        Interesting aspects they mentioned: ${interestingAspects.join(", ")}.
        Key points: ${keyPoints.join(", ")}.
        Candidate level: ${session.candidateLevel}.
        ${
          session.lastResponseAnalysis.humorPotential
            ? "You may include subtle professional humor if appropriate."
            : ""
        }
        Keep the question concise (1 sentence) and natural.`,
        },
      ],
    };

    return await this.callGeminiAPI([followUpPrompt], 0.6);
  }

  async generateAcknowledgment(session) {
    const { sentiment, keyPoints } = session.lastResponseAnalysis;

    if (keyPoints.length === 0) {
      return null;
    }

    const acknowledgmentPrompt = {
      role: "user",
      parts: [
        {
          text: `Generate a brief (1 sentence) acknowledgment of the candidate's last response. 
        Key points they mentioned: ${keyPoints.join(", ")}.
        Sentiment: ${sentiment}.
        ${
          session.lastResponseAnalysis.humorPotential
            ? "You may include subtle professional humor if appropriate."
            : ""
        }
        Make it sound natural like a human recruiter would.`,
        },
      ],
    };

    return await this.callGeminiAPI([acknowledgmentPrompt], 0.5);
  }

  getInterviewPhase(questionCount) {
    if (questionCount <= 2) return "warmup";
    if (questionCount < this.MAX_QUESTIONS - 2) return "mid";
    return "conclusion";
  }

  selectQuestionType(phase, session) {
    const types = {
      warmup: ["resume-based technical", "resume-based behavioral"],
      mid: [
        `${session.candidateLevel}-level technical`,
        "behavioral",
        "problem-solving",
        "situational",
        "hypothetical scenario",
      ],
      conclusion: [
        "career goals",
        "professional development",
        "final technical reflection",
        "open-ended",
      ],
    };

    const weights = {
      warmup: [0.4, 0.4, 0.2],
      mid: [0.4, 0.3, 0.15, 0.1, 0.05],
      conclusion: [0.3, 0.3, 0.2, 0.2],
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

  getTemperature(phase) {
    const temps = {
      warmup: 0.7,
      mid: 0.6,
      conclusion: 0.5,
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

      const responseText = await this.callGeminiAPI(session.messages, 0.5);
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
    const conclusionPrompt = {
      role: "user",
      parts: [
        {
          text: isTimeoutConclusion
            ? `The candidate didn't respond to multiple follow-ups. 
           Please conclude the interview professionally by thanking them 
           for their time and mentioning that we'll be in touch if 
           there's interest in proceeding. Keep it brief (1-2 sentences).`
            : `Please conclude the interview professionally. 
           Thank the candidate for their time, mention next steps 
           (like "We'll review your answers and get back to you"), 
           and wish them a good day. Keep it under 3 sentences.`,
        },
      ],
    };

    session.messages.push(conclusionPrompt);
    const closingText = await this.callGeminiAPI(session.messages);
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

  async callGeminiAPI(messages, temperature = 0.5) {
    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 300,
            topP: 0.9,
          },
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
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
