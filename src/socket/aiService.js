class AIService {
  constructor(apiKey, modelName) {
    this.GEMINI_API_KEY = apiKey;
    this.MODEL_NAME = modelName;
    this.API_URL = `https://generativelanguage.googleapis.com/v1/models/${this.MODEL_NAME}:generateContent?key=${this.GEMINI_API_KEY}`;
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

    return await this.callGeminiAPI([followUpPrompt], 0.5);
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
}

module.exports = AIService; 