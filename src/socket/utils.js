// Utility functions
class InterviewUtils {
  static weightedRandom(weights) {
    const total = weights.reduce((a, b) => a + b);
    const random = Math.random() * total;
    let sum = 0;

    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) return i;
    }

    return weights.length - 1;
  }

  static getTemperature(phase) {
    const temps = {
      warmup: 0.7,
      mid: 0.6,
      conclusion: 0.5,
    };
    return temps[phase];
  }

  static getInterviewPhase(questionCount, maxQuestions) {
    if (questionCount <= 2) return "warmup";
    if (questionCount < maxQuestions - 2) return "mid";
    return "conclusion";
  }
}

module.exports = InterviewUtils; 