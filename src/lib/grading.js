// src/lib/grading.js

export function isAutoGraded(type) {
  return ['gap_fill', 'multiple_choice', 'gap_fill_dropdown', 'sentence_jumble', 'vocabulary_matching'].includes(type);
}

export function gradeActivity(activity, value) {
  const type = activity.type;
  const config = activity.config || {};

  switch (type) {
    case 'gap_fill':
      return gradeGapFill(config, value);
    case 'multiple_choice':
      return gradeMultipleChoice(config, value);
    case 'gap_fill_dropdown':
      return gradeGapFillDropdown(config, value);
    case 'sentence_jumble':
      return gradeSentenceJumble(config, value);
    case 'vocabulary_matching':
      return gradeVocabularyMatching(config, value);
    case 'short_answer':
      return gradeShortAnswer(config, value);
    case 'reasoning':
      return gradeReasoning(config, value);
    default:
      return { score: 0, autoCorrect: null, maxScore: 0 };
  }
}

export function gradeGapFill(config, value) {
  const studentAnswers = value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s !== '');

  const correctAnswerSets = (config.answers || [])
    .map(item => item.split('|').map(s => s.trim().toLowerCase()).filter(Boolean));

  if (correctAnswerSets.length === 0) {
    return { score: 0, autoCorrect: null, maxScore: 0 };
  }

  let score = 0;
  let allCorrect = true;

  for (let i = 0; i < Math.min(studentAnswers.length, correctAnswerSets.length); i++) {
    const studentAns = studentAnswers[i] || '';
    const allowed = correctAnswerSets[i] || [];
    const isMatch = allowed.includes(studentAns);
    if (isMatch) {
      score++;
    } else {
      allCorrect = false;
    }
  }

  const allFilled = studentAnswers.length >= correctAnswerSets.length;
  if (studentAnswers.length > correctAnswerSets.length) {
    allCorrect = false;
  }

  const autoCorrect = allFilled ? allCorrect : null;

  return {
    score: score,
    autoCorrect: autoCorrect,
    maxScore: correctAnswerSets.length,
  };
}

export function gradeMultipleChoice(config, value) {
  const correctIndex = config.correctIndex;
  if (correctIndex === undefined || correctIndex === null) {
    return { score: 0, autoCorrect: null, maxScore: 1 };
  }
  const selected = parseInt(value, 10);
  const isCorrect = selected === correctIndex;
  return {
    score: isCorrect ? 1 : 0,
    autoCorrect: isCorrect,
    maxScore: 1,
  };
}

// New: Gap Fill Dropdown
export function gradeGapFillDropdown(config, value) {
  // value is a comma-separated list of selected indices (e.g., "0,2,1")
  const selectedIndices = value ? value.split(',').map(s => parseInt(s.trim(), 10)) : [];
  const dropdownOptions = config.dropdownOptions || [];
  // The correct answer is the first option in each line (index 0)
  let score = 0;
  let allCorrect = true;
  let maxScore = dropdownOptions.length;

  for (let i = 0; i < dropdownOptions.length; i++) {
    const options = dropdownOptions[i] || [];
    if (options.length === 0) continue;
    const selectedIdx = selectedIndices[i] !== undefined ? selectedIndices[i] : -1;
    if (selectedIdx === 0) {
      score++;
    } else {
      allCorrect = false;
    }
  }

  // Only auto-correct if all blanks are filled
  const allFilled = selectedIndices.length >= dropdownOptions.length && selectedIndices.every(idx => idx >= 0);
  const autoCorrect = allFilled ? allCorrect : null;

  return { score, autoCorrect, maxScore };
}

// New: Sentence Jumble
export function gradeSentenceJumble(config, value) {
  const correctWords = config.words || [];
  const userOrder = value ? value.split(',').map(s => parseInt(s.trim(), 10)) : [];
  // Check if user order matches the correct order (0,1,2,...)
  const isCorrect = userOrder.length === correctWords.length && userOrder.every((idx, i) => idx === i);
  const score = isCorrect ? 1 : 0; // full score if correct, else 0
  return {
    score: score,
    autoCorrect: isCorrect,
    maxScore: 1,
  };
}

// New: Vocabulary Matching
export function gradeVocabularyMatching(config, value) {
  let matches = {};
  try {
    matches = value ? JSON.parse(value) : {};
  } catch { /* ignore */ }
  const pairs = config.pairs || [];
  let correctCount = 0;
  for (const [termIdx, defIdx] of Object.entries(matches)) {
    const idx = parseInt(termIdx, 10);
    if (idx >= 0 && idx < pairs.length && defIdx === idx) {
      correctCount++;
    }
  }
  const maxScore = pairs.length;
  const allCorrect = correctCount === maxScore;
  return {
    score: correctCount,
    autoCorrect: allCorrect,
    maxScore: maxScore,
  };
}

function gradeShortAnswer(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}

function gradeReasoning(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}