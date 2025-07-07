const InterviewUtils = require('./utils');

class InterviewEngine {
  constructor(maxQuestions) {
    this.MAX_QUESTIONS = maxQuestions;
    this.RESUME_QUESTION_RATIO = 0.3;
  }

  selectQuestionType(phase, session) {
    const questionPools = {
      warmup: [
        { type: "resume-based technical", weight: 0.5 },
        { type: "resume-based behavioral", weight: 0.5 },
      ],
      mid: [
        { type: `${session.candidateLevel}-level technical`, weight: 0.4 },
        { type: "behavioral", weight: 0.3 },
        { type: "problem-solving", weight: 0.15 },
        { type: "situational", weight: 0.1 },
        { type: "hypothetical scenario", weight: 0.05 },
      ],
      conclusion: [
        { type: "career goals", weight: 0.3 },
        { type: "professional development", weight: 0.3 },
        { type: "final technical reflection", weight: 0.2 },
        { type: "open-ended", weight: 0.2 },
      ],
    };

    const pool = questionPools[phase];
    const weights = pool.map((p) => p.weight);
    const typeIndex = InterviewUtils.weightedRandom(weights);
    return pool[typeIndex].type;
  }

  shouldAskFollowUp(session) {

    if (session.questionCount < 2) return false;
    if (session.questionCount >= this.MAX_QUESTIONS - 2) return false;

    const interestingAspects =
      session.lastResponseAnalysis?.interestingAspects?.length || 0;
    const baseProbability = 0.4;
    const followUpProbability = baseProbability + interestingAspects * 0.15;

    return Math.random() < Math.min(followUpProbability, 0.7);
  }

  determineCandidateLevel(analysis, session) {
    const { technicalDepth, experienceIndicators, wordCount, sentiment } = analysis;
    const progressFactor = session.questionCount / this.MAX_QUESTIONS;

    const technicalWeight = 0.45;
    const normalizedTechnicalDepth = (technicalDepth / 5) * 5;
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

    const communicationScore =
      Math.min(wordCount / 30, 1) * 3 +
      (sentiment === "positive" ? 2 : sentiment === "neutral" ? 1 : 0);

    const communicationWeight = 0.3;
    session.candidateScore.communicationScore =
      session.candidateScore.communicationScore * (1 - communicationWeight) +
      communicationScore * communicationWeight;

    session.candidateScore.totalScore =
      session.candidateScore.technicalDepth * 0.5 +
      session.candidateScore.experienceScore * 0.3 +
      session.candidateScore.communicationScore * 0.2;

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

    const seniorThreshold = 3.0 + 0.7 * progressFactor;
    const midThreshold = 1.5 + 0.5 * progressFactor;

    
    console.log("senior threshold---->", seniorThreshold);
    console.log("mid threshold---->", midThreshold);
    console.log("total score---->", session.candidateScore.totalScore);

    if (session.candidateScore.totalScore >= seniorThreshold) {
      return "senior";
    } else if (session.candidateScore.totalScore >= midThreshold) {
      return "mid";
    }
    return "junior";
  }
}

module.exports = InterviewEngine; 