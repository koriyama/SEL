// src/lib/grading.js

// Helper: extract bracketed words from text (e.g., "The [[cat]] sat on the [[mat]]." -> ["cat", "mat"])
function extractBracketedWords(text) {
  if (!text) return [];
  const matches = text.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/\[\[|\]\]/g, '').trim());
}

export function isAutoGraded(type) {
  return ['gap_fill', 'multiple_choice', 'gap_fill_dropdown', 'sentence_jumble', 'vocabulary_matching', 'listening', 'dictation'].includes(type);
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
    case 'listening':
      return gradeListening(config, value);
    case 'dictation':
      return gradeDictation(config, value);
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

// ---------- FIXED: Dropdown Gap Fill ----------
export function gradeGapFillDropdown(config, value) {
  // Extract bracketed words from the text (use text_en first, then text_ja, then text)
  const text = config.text_en || config.text_ja || config.text || '';
  const correctWords = extractBracketedWords(text);
  if (!correctWords.length) {
    // If no bracketed words, treat as ungraded or maxScore 0
    return { score: 0, autoCorrect: null, maxScore: 0 };
  }

  const options = config.dropdownOptions || [];
  // For each blank, find which option index matches the bracketed word (case-insensitive)
  const correctIndices = correctWords.map((word, idx) => {
    const opts = options[idx] || [];
    const matchIdx = opts.findIndex(opt => opt.trim().toLowerCase() === word.toLowerCase());
    // If not found, fallback to 0 (shouldn't happen if teacher sets options correctly)
    return matchIdx !== -1 ? matchIdx : 0;
  });

  // Student value is a comma-separated string of selected indices
  const selectedIndices = value ? value.split(',').map(s => parseInt(s.trim(), 10)) : [];
  let score = 0;
  let allCorrect = true;
  const maxScore = correctIndices.length;

  for (let i = 0; i < correctIndices.length; i++) {
    const selected = selectedIndices[i] !== undefined ? selectedIndices[i] : -1;
    if (selected === correctIndices[i]) {
      score++;
    } else {
      allCorrect = false;
    }
  }

  // If student didn't fill all blanks, autoCorrect is null (not fully graded)
  const allFilled = selectedIndices.length >= correctIndices.length && selectedIndices.every(idx => idx >= 0);
  const autoCorrect = allFilled ? allCorrect : null;

  return { score, autoCorrect, maxScore };
}

export function gradeSentenceJumble(config, value) {
  const correctWords = config.words || [];
  const userOrder = value ? value.split(',').map(s => parseInt(s.trim(), 10)) : [];

  if (correctWords.length === 0 || userOrder.length === 0) {
    return { score: 0, autoCorrect: false, maxScore: correctWords.length || 1 };
  }

  let correctPositions = 0;
  const maxScore = correctWords.length;

  for (let i = 0; i < Math.min(userOrder.length, correctWords.length); i++) {
    if (userOrder[i] === i) {
      correctPositions++;
    }
  }

  const allCorrect = correctPositions === correctWords.length && userOrder.length === correctWords.length;

  return {
    score: correctPositions,
    autoCorrect: allCorrect,
    maxScore: maxScore,
  };
}

export function gradeVocabularyMatching(config, value) {
  let firstAttempts = {};
  try {
    firstAttempts = value ? JSON.parse(value) : {};
  } catch { /* ignore */ }

  const pairs = config.pairs || [];
  let correctCount = 0;

  for (const [termIdx, defIdx] of Object.entries(firstAttempts)) {
    const t = parseInt(termIdx, 10);
    const d = parseInt(defIdx, 10);
    if (t === d) {
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

export function gradeListening(config, value) {
  const questions = config.questions || [];
  if (!value) return { score: 0, autoCorrect: null, maxScore: questions.length };
  
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { score: 0, autoCorrect: null, maxScore: questions.length };
  }

  let correctCount = 0;
  for (let i = 0; i < questions.length; i++) {
    const userAnswer = parsed[i];
    const correct = questions[i].correct_answer;
    if (userAnswer !== undefined && userAnswer === correct) {
      correctCount++;
    }
  }
  const allCorrect = correctCount === questions.length;
  return {
    score: correctCount,
    autoCorrect: allCorrect,
    maxScore: questions.length,
  };
}

export function gradeDictation(config, value) {
  const expected = (config.expected_text || '').trim().toLowerCase();
  const user = (value || '').trim().toLowerCase();
  if (!expected) return { score: 0, autoCorrect: null, maxScore: 1 };
  const isCorrect = user === expected;
  return {
    score: isCorrect ? 1 : 0,
    autoCorrect: isCorrect,
    maxScore: 1,
  };
}

function gradeShortAnswer(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}

function gradeReasoning(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}