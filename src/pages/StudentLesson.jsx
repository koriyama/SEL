// src/pages/StudentLesson.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import { supabase } from '../lib/supabaseClient';
import { 
  getLessonBySlug, 
  getDraftLessonBySlug, 
  listSections, 
  listActivities,
  listVocabulary, 
  saveSubmission, 
  getSubmission,
  setStudentName,
  getNextAttemptNumber,
  insertSubmissionViaRpc,
  getSubmissionByLessonStudent
} from '../lib/api';
import { 
  gradeGapFill, 
  gradeMultipleChoice, 
  gradeGapFillDropdown, 
  gradeSentenceJumble, 
  gradeVocabularyMatching,
  gradeListening,
  gradeDictation
} from '../lib/grading';
import { renderInline } from '../lib/inlineMarkup';
import AudioPlayer from '../components/AudioPlayer';
import GapFillPlayer from '../components/activity-players/GapFillPlayer';
import MultipleChoicePlayer from '../components/activity-players/MultipleChoicePlayer';
import ShortAnswerPlayer from '../components/activity-players/ShortAnswerPlayer';
import ReasoningPlayer from '../components/activity-players/ReasoningPlayer';
import GapFillDropdownPlayer from '../components/activity-players/GapFillDropdownPlayer';
import SentenceJumblePlayer from '../components/activity-players/SentenceJumblePlayer';
import VocabularyMatchingPlayer from '../components/activity-players/VocabularyMatchingPlayer';
import DictationPlayer from '../components/activity-players/DictationPlayer';
import ReferenceDrawer from '../components/ReferenceDrawer';
import SaveExitButton from '../components/SaveExitButton';

// Helper to strip punctuation for display
function stripPunctuation(word) {
  return word.replace(/[.,!?;:"]$/, '');
}

// ---- Language translations ----
const translations = {
  en: {
    enterNameTitle: (title) => `${title}`,
    enterNameSubtitle: 'Level: {level}',
    enterNamePrompt: 'Please enter your name to start the lesson.',
    enterNameImportant: '⚠️ Important: If you return later, use the exact same name (case‑sensitive) to continue your progress.',
    enterNameAutoSave: '⏳ Your answers are saved automatically as you go.',
    namePlaceholder: 'Your full name',
    startButton: 'Start Lesson',
    previewBadge: '🔍 PREVIEW MODE',
    // 
    instructionsTitle: (title, level, sections, activities) => `${title} · Level: ${level} · ${sections} sections · ${activities} activities`,
    aboutLesson: '📖 About this lesson',
    aboutLessonText: (sections) => `This lesson is divided into ${sections} sections. You'll complete activities in order, and your progress is saved automatically.`,
    navigation: '📌 Navigation',
    navItems: [
      'Use <strong>Next</strong> and <strong>Previous</strong> buttons to move between pages.',
      'Your answers are saved automatically as you go.',
      'You can return later using the same name to continue.'
    ],
    referenceDrawer: '📂 Reference Drawer',
    drawerItems: [
      'Tap the <strong>grey bar</strong> at the bottom of the screen to open/close the reference panel.',
      'It contains the reading text, audio, images, and vocabulary support.',
      'You can keep it open while answering questions.'
    ],
    drawerExample: '👇 Tap the bar to show/hide',
    activityTypes: '✅ Activity types',
    startLessonButton: '🚀 Start Lesson',
    wellDone: '🎉 Well done! 🎉',
    thankYou: 'Thank you for your hard work! Your answers have been submitted.',
    seeAnswers: '👀 See my answers',
    hideAnswers: 'Hide my answers',
    integrityWarning: '📸 Screenshots and copying are not permitted. Please respect academic integrity.',
    yourAnswers: 'Your answers',
    yourAnswerLabel: 'Your answer:',
    statusFull: '✅ Full',
    statusZero: '❌ Zero',
    statusPartial: '🟡 Partial',
    statusReview: '📝 Teacher review',
    statusNoGrade: '❓ No grade',
  },
  ja: {
    enterNameTitle: (title) => `${title}`,
    enterNameSubtitle: 'レベル: {level}',
    enterNamePrompt: 'レッスンを始めるには、お名前を入力してください。',
    enterNameImportant: '⚠️ 重要: 後で戻る場合は、<strong>同じ名前</strong>（大文字小文字区別）を使用して続けてください。',
    enterNameAutoSave: '⏳ 回答は自動的に保存されます。',
    namePlaceholder: 'フルネーム',
    startButton: 'レッスンを始める',
    previewBadge: '🔍 プレビューモード',
    //
    instructionsTitle: (title, level, sections, activities) => `${title} · レベル: ${level} · ${sections} セクション · ${activities} アクティビティ`,
    aboutLesson: '📖 このレッスンについて',
    aboutLessonText: (sections) => `このレッスンは ${sections} つのセクションに分かれています。順番にアクティビティを進め、進捗は自動保存されます。`,
    navigation: '📌 ナビゲーション',
    navItems: [
      '<strong>次へ</strong> と <strong>前へ</strong> のボタンを使ってページを移動します。',
      '回答は自動保存されます。',
      '同じ名前を使えば後で続きから始められます。'
    ],
    referenceDrawer: '📂 リファレンスドロワー',
    drawerItems: [
      '画面下部の <strong>灰色のバー</strong> をタップしてリファレンスパネルを開閉します。',
      'リーディング本文、音声、画像、語彙サポートが含まれています。',
      '質問に答えながらパネルを開いたままにできます。'
    ],
    drawerExample: '👇 バーをタップして表示/非表示',
    activityTypes: '✅ アクティビティの種類',
    startLessonButton: '🚀 レッスンを始める',
    wellDone: '🎉 お疲れ様でした！ 🎉',
    thankYou: 'ご協力ありがとうございました。回答が送信されました。',
    seeAnswers: '👀 自分の回答を見る',
    hideAnswers: '回答を隠す',
    integrityWarning: '📸 スクリーンショットやコピーは禁止されています。学術的誠実さを守ってください。',
    yourAnswers: 'あなたの回答',
    yourAnswerLabel: 'あなたの回答:',
    statusFull: '✅ 完全正解',
    statusZero: '❌ 不正解',
    statusPartial: '🟡 部分点',
    statusReview: '📝 教師確認',
    statusNoGrade: '❓ 未評価',
  }
};

// ---- Player Components ----
function ListeningPlayer({ activity, value, onChange, disabled, language }) {
  const config = activity.config || {};
  const questions = config.questions || [];
  const prompt = activity.prompt || '';
  const [answers, setAnswers] = useState(() => {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  });

  const handleAnswer = (qIdx, val) => {
    const newAnswers = { ...answers, [qIdx]: val };
    setAnswers(newAnswers);
    onChange(JSON.stringify(newAnswers));
  };

  if (!questions || questions.length === 0) {
    return <div className="text-yellow-600 text-sm">No questions available for this listening activity.</div>;
  }

  return (
    <div className="space-y-4">
      {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
      {config.audio_url && <AudioPlayer src={config.audio_url} />}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const questionText = language === 'en' ? q.question_en : q.question_ja || q.question_en;
          return (
            <div key={idx} className="border-t border-warm-200 pt-2">
              <p className="font-medium text-sm">{questionText}</p>
              {q.type === 'multiple_choice' && (
                <div className="space-y-1 mt-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`q${idx}`}
                        checked={answers[idx] === oi}
                        onChange={() => handleAnswer(idx, oi)}
                        disabled={disabled}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'true_false' && (
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q${idx}`}
                      checked={answers[idx] === 0}
                      onChange={() => handleAnswer(idx, 0)}
                      disabled={disabled}
                    /> True
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q${idx}`}
                      checked={answers[idx] === 1}
                      onChange={() => handleAnswer(idx, 1)}
                      disabled={disabled}
                    /> False
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudentLesson() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('draft') === 'true';
  const { confirm } = useConfirm();

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('preferred_language') || 'en';
  });

  const t = translations[language];

  const [lesson, setLesson] = useState(null);
  const [sections, setSections] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [studentName, setStudentName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveTimer = useRef(null);
  const isSaving = useRef(false);

  const activitiesContainerRef = useRef(null);

  // Load lesson
  useEffect(() => {
    async function loadLesson() {
      try {
        console.log('🔍 Starting loadLesson, isPreview:', isPreview, 'slug:', slug);
        
        let data;
        if (isPreview) {
          data = await getDraftLessonBySlug(slug);
        } else {
          data = await getLessonBySlug(slug);
        }
        if (!data) throw new Error('Lesson not found');
        console.log('📦 Lesson data:', data);
        setLesson(data);

        const loadedVocabulary = await listVocabulary(data.id);
        console.log('📚 Vocabulary loaded:', loadedVocabulary);
        setVocabulary(loadedVocabulary || []);

        let loadedSections = await listSections(data.id);
        const allActivities = await listActivities(data.id);
        console.log('📊 All activities loaded:', allActivities);

        const activitiesBySection = {};
        allActivities.forEach(act => {
          const secId = act.section_id;
          if (!secId) return;
          if (!activitiesBySection[secId]) activitiesBySection[secId] = [];
          activitiesBySection[secId].push(act);
        });
        Object.keys(activitiesBySection).forEach(secId => {
          activitiesBySection[secId].sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        loadedSections = loadedSections.map(section => ({
          ...section,
          activities: activitiesBySection[section.id] || []
        }));
        console.log('📚 Final sections with activities:', loadedSections);
        setSections(loadedSections || []);

        if (!isPreview) {
          const storedName = localStorage.getItem(`smiley_student_name_${slug}`);
          if (storedName) {
            setStudentName(storedName);
            setNameSubmitted(true);
            setShowInstructions(true);
            try {
              await setStudentName(storedName);
              const existing = await getSubmissionByLessonStudent(data.id, storedName);
              if (existing) {
                console.log('📋 Found existing submission:', existing.id);
                setSubmissionId(existing.id);
                setCurrentPage(existing.current_page || 0);
                setAnswers(existing.answers || {});
                if (existing.submitted_at) {
                  setIsSubmitted(true);
                  setScore(existing.score);
                }
              } else {
                console.log('ℹ️ No existing submission found');
              }
            } catch (err) {
              console.warn('⚠️ Could not fetch existing submission on load:', err);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error loading lesson:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLesson();
  }, [slug, isPreview]);

  // Auto-save
  const saveDraft = useCallback(async () => {
    if (isPreview || isSubmitted || !submissionId) return;
    if (isSaving.current) return;

    isSaving.current = true;
    try {
      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers,
      }, studentName);
      console.log('✅ Auto-save successful');
    } catch (err) {
      console.error('❌ Auto-save failed:', err);
    } finally {
      isSaving.current = false;
    }
  }, [isPreview, isSubmitted, submissionId, currentPage, answers, studentName]);

  useEffect(() => {
    if (!submissionId || isPreview || isSubmitted) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDraft, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [saveDraft, submissionId, isPreview, isSubmitted, answers, currentPage]);

  // ---- Autofocus ----
  useEffect(() => {
    if (loading || sections.length === 0) return;
    const container = activitiesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const firstInput = container.querySelector('input, textarea, select');
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      }
    });
  }, [currentPage, sections, loading]);

  // ---- Prevent copying ----
  useEffect(() => {
    if (!isSubmitted) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitted]);

  // ---- handleNameSubmit ----
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = studentName.trim().toLowerCase();
    if (!trimmedName) return;
    localStorage.setItem(`smiley_student_name_${slug}`, trimmedName);
    setNameSubmitted(true);
    setShowInstructions(true);

    if (!isPreview) {
      try {
        await setStudentName(trimmedName);

        const existing = await getSubmissionByLessonStudent(lesson.id, trimmedName);

        if (existing && existing.status === 'in_progress') {
          console.log('✅ Resuming in-progress submission:', existing.id);
          setSubmissionId(existing.id);
          setCurrentPage(existing.current_page || 0);
          setAnswers(existing.answers || {});
          return;
        }

        if (existing && existing.status === 'completed') {
          const startNew = await confirm({
            title: 'Start New Attempt?',
            message: 'You have already completed this lesson. Would you like to start a new attempt? (Your previous results will be kept.)',
            confirmText: 'Start New',
            cancelText: 'Cancel',
            type: 'info'
          });
          if (!startNew) {
            setNameSubmitted(false);
            setShowInstructions(false);
            return;
          }
        }

        let attempt = await getNextAttemptNumber(lesson.id, trimmedName);
        let inserted = false;
        let maxRetries = 10;
        while (!inserted && maxRetries > 0) {
          try {
            const data = await insertSubmissionViaRpc(
              lesson.id,
              trimmedName,
              attempt,
              0,
              {},
              'in_progress'
            );
            console.log(`✅ New submission created (attempt ${attempt}):`, data.id);
            setSubmissionId(data.id);
            inserted = true;
          } catch (err) {
            if (err.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
              attempt++;
              maxRetries--;
              console.log(`⚠️ Attempt ${attempt-1} already exists, trying ${attempt}`);
            } else {
              throw err;
            }
          }
        }
        if (!inserted) {
          throw new Error('Could not create a new submission after multiple attempts.');
        }
      } catch (err) {
        console.error('❌ Error with submission:', err);
        toast.error('Could not start or resume lesson. Please try again.\n\nError: ' + err.message);
        setNameSubmitted(false);
        setShowInstructions(false);
      }
    }
  };

  const handleAnswerChange = (activityId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [activityId]: value,
    }));
  };

  const goToPage = (index) => {
    if (index < 0 || index >= sections.length) return;
    setCurrentPage(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (isPreview || isSubmitted) {
      console.warn('⚠️ Cannot submit: preview or already submitted');
      return;
    }
    if (!submissionId) {
      toast.error('No submission found. Please restart the lesson.');
      return;
    }

    setIsSubmitting(true);

    try {
      let totalScore = 0;
      let maxAutoScore = 0;
      const gradedAnswers = { ...answers };

      sections.forEach((section) => {
        (section.activities || []).forEach((activity) => {
          let result = null;
          const userValue = gradedAnswers[activity.id] || '';
          switch (activity.type) {
            case 'gap_fill':
              result = gradeGapFill(activity.config, userValue);
              break;
            case 'multiple_choice':
              result = gradeMultipleChoice(activity.config, userValue);
              break;
            case 'gap_fill_dropdown':
              result = gradeGapFillDropdown(activity.config, userValue);
              break;
            case 'sentence_jumble':
              result = gradeSentenceJumble(activity.config, userValue);
              break;
            case 'vocabulary_matching':
              result = gradeVocabularyMatching(activity.config, userValue);
              break;
            case 'listening':
              result = gradeListening(activity.config, userValue);
              break;
            case 'dictation':
              result = gradeDictation(activity.config, userValue);
              break;
            default:
              return;
          }
          if (result) {
            gradedAnswers[`${activity.id}_graded`] = result;
            totalScore += result.score || 0;
            maxAutoScore += result.maxScore || 0;
          }
        });
      });

      const finalScore = maxAutoScore > 0 ? Math.round((totalScore / maxAutoScore) * 100) : 0;
      console.log(`📊 Final score: ${finalScore}% (${totalScore}/${maxAutoScore})`);

      const nameToUse = studentName || localStorage.getItem(`smiley_student_name_${slug}`);
      if (!nameToUse) {
        throw new Error('Student name not found. Please refresh and try again.');
      }

      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers: gradedAnswers,
        submitted_at: new Date().toISOString(),
        score: finalScore,
        max_auto_score: maxAutoScore,
        status: 'completed'
      }, nameToUse);

      setAnswers(gradedAnswers);
      setIsSubmitted(true);
      setScore(finalScore);
      toast.success('✅ Submission completed successfully!');
    } catch (err) {
      console.error('❌ Final submission failed:', err);
      toast.error(`Failed to submit: ${err.message || 'Unknown error'}\n\nPlease check your internet connection and try again. If the problem persists, contact support.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Save & Exit handler ----
  const handleSaveAndExit = useCallback(async () => {
    if (!submissionId) {
      console.warn('⚠️ Cannot save: no submission ID');
      return;
    }
    try {
      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers,
      }, studentName);
      console.log('✅ Saved before exit');
      localStorage.removeItem(`smiley_student_name_${slug}`);
      window.location.href = `/lesson/${slug}`;
    } catch (err) {
      console.error('❌ Save & Exit failed:', err);
      toast.error('Failed to save progress. Please try again.');
    }
  }, [submissionId, currentPage, answers, slug, studentName]);

  // Render activity player
  const renderActivity = (activity, index) => {
    if (!activity || !activity.type) {
      return <div className="text-red-500">Invalid activity</div>;
    }

    const questionNumber = index + 1;
    
    let prompt = '';
    if (language === 'en') {
      prompt = activity.prompt_en || activity.prompt || '';
    } else {
      prompt = activity.prompt_ja || '';
    }
    if (!prompt) prompt = activity.prompt_en || activity.prompt || '';
    
    const displayPrompt = prompt ? `Q${questionNumber}. ${prompt}` : `Q${questionNumber}`;
    const activityWithPrompt = { ...activity, prompt: displayPrompt };

    const commonProps = {
      key: activity.id,
      activity: activityWithPrompt,
      value: answers[activity.id] || '',
      onChange: (val) => handleAnswerChange(activity.id, val),
      disabled: isSubmitted || isPreview,
      autoFocus: index === 0 && currentPage === 0,
      language: language,
    };

    if (activity.type === 'multiple_choice') {
      const config = activity.config || {};
      const options = language === 'en' ? config.options_en : config.options_ja;
      const displayOptions = options && options.length > 0 && options.some(o => o) ? options : config.options_en || [];
      const activityWithLanguage = {
        ...activityWithPrompt,
        config: {
          ...config,
          options: displayOptions,
          correctIndex: config.correctIndex
        }
      };
      return <MultipleChoicePlayer {...commonProps} activity={activityWithLanguage} />;
    }

    if (activity.type === 'gap_fill') {
      return <GapFillPlayer {...commonProps} />;
    }
    if (activity.type === 'gap_fill_dropdown') {
      return <GapFillDropdownPlayer {...commonProps} />;
    }

    switch (activity.type) {
      case 'short_answer':
        return <ShortAnswerPlayer {...commonProps} />;
      case 'reasoning':
        return <ReasoningPlayer {...commonProps} />;
      case 'sentence_jumble':
        return <SentenceJumblePlayer {...commonProps} onSubmit={() => {}} />;
      case 'vocabulary_matching':
        return <VocabularyMatchingPlayer {...commonProps} />;
      case 'listening':
        return <ListeningPlayer {...commonProps} />;
      case 'dictation':
        return <DictationPlayer {...commonProps} />;
      default:
        return (
          <div className="text-red-500 p-2 bg-red-50 rounded">
            Unknown activity type: {activity.type}
          </div>
        );
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-warm-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-warm-50">
        <div className="card p-6 border-red-200 bg-red-50 text-red-700 max-w-md text-center">
          <p>{error}</p>
          <p className="text-xs text-warm-500 mt-2">Slug: {slug} | Preview: {String(isPreview)}</p>
        </div>
      </div>
    );
  }

  // ---------- Welcome / Name entry ----------
  if (!nameSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-warm-50">
        <div className="card p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-warm-900 mb-2">
              {t.enterNameTitle(lesson.title)}
            </h1>
            {lesson.level && (
              <div className="flex justify-center">
                <span className={`level-badge level-badge-${(lesson.level || 'B1').toUpperCase()}`}>
                  {lesson.level}
                </span>
              </div>
            )}
            <p className="mt-4 text-sm text-warm-600">
              {t.enterNamePrompt}
            </p>
            <div className="mt-3 text-xs text-warm-500 border-t border-warm-200 pt-3">
              <p dangerouslySetInnerHTML={{ __html: t.enterNameImportant }} />
              <p className="mt-1">{t.enterNameAutoSave}</p>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-full border border-warm-200 overflow-hidden">
              <button
                onClick={() => { setLanguage('en'); localStorage.setItem('preferred_language', 'en'); }}
                className={`px-4 py-1 text-sm font-medium transition ${
                  language === 'en' ? 'bg-primary-600 text-white' : 'bg-transparent text-warm-600 hover:bg-warm-100'
                }`}
              >
                English
              </button>
              <button
                onClick={() => { setLanguage('ja'); localStorage.setItem('preferred_language', 'ja'); }}
                className={`px-4 py-1 text-sm font-medium transition ${
                  language === 'ja' ? 'bg-primary-600 text-white' : 'bg-transparent text-warm-600 hover:bg-warm-100'
                }`}
              >
                日本語
              </button>
            </div>
          </div>

          {isPreview && (
            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {t.previewBadge}
            </span>
          )}
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="input-field"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full btn-primary py-3 text-base"
            >
              {t.startButton}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- Instructions ----------
  if (showInstructions) {
    const totalActivities = sections.reduce((acc, sec) => acc + (sec.activities || []).length, 0);
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-warm-50">
        <div className="card p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-warm-900 mb-2">
              {t.instructionsTitle(lesson.title, lesson.level, sections.length, totalActivities)}
            </h1>
          </div>

          <div className="space-y-4 text-warm-700">
            <div className="bg-primary-50 p-4 rounded-card">
              <h3 className="font-semibold text-primary-800">{t.aboutLesson}</h3>
              <p className="text-sm mt-1">{t.aboutLessonText(sections.length)}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-card">
              <h3 className="font-semibold text-green-800">{t.navigation}</h3>
              <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                {t.navItems.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-card">
              <h3 className="font-semibold text-yellow-800">{t.referenceDrawer}</h3>
              <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                {t.drawerItems.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
              <div className="mt-2 text-xs text-warm-500">
                <span className="inline-block bg-warm-200 px-3 py-1 rounded-full">
                  {t.drawerExample}
                </span>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-card">
              <h3 className="font-semibold text-purple-800">
                {t.activityTypes}
              </h3>
              <ul className="text-sm list-disc list-inside mt-1 space-y-1">
                {(() => {
                  const typeCounts = {};
                  sections.forEach(section => {
                    (section.activities || []).forEach(act => {
                      const type = act.type;
                      typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });
                  });

                  const typeLabels = {
                    en: {
                      gap_fill: 'Gap Fill',
                      multiple_choice: 'Multiple Choice',
                      short_answer: 'Short Answer',
                      reasoning: 'Reasoning',
                      gap_fill_dropdown: 'Gap Fill (Dropdown)',
                      sentence_jumble: 'Sentence Jumble',
                      vocabulary_matching: 'Vocabulary Matching',
                      listening: 'Listening',
                      dictation: 'Dictation',
                    },
                    ja: {
                      gap_fill: '穴埋め',
                      multiple_choice: '選択問題',
                      short_answer: '記述問題',
                      reasoning: '論述問題',
                      gap_fill_dropdown: '穴埋め（ドロップダウン）',
                      sentence_jumble: '並べ替え',
                      vocabulary_matching: '語彙マッチング',
                      listening: 'リスニング',
                      dictation: 'ディクテーション',
                    }
                  };

                  const items = Object.entries(typeCounts)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([type, count]) => {
                      const label = typeLabels[language]?.[type] || type;
                      const countLabel = language === 'ja'
                        ? `${count} アクティビティ`
                        : `${count} ${count === 1 ? 'activity' : 'activities'}`;
                      return (
                        <li key={type}>
                          <span className="font-medium">{label}</span> – {countLabel}
                        </li>
                      );
                    });

                  return items.length > 0 ? items : <li>{language === 'ja' ? 'アクティビティがありません' : 'No activities'}</li>;
                })()}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowInstructions(false)}
              className="btn-primary text-lg py-3 px-8"
            >
              {t.startLessonButton}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Results ----------
  if (isSubmitted) {
    const allActivities = sections.flatMap(s => s.activities || []);
    const answerSummary = allActivities.map((act, idx) => {
      const qNum = idx + 1;
      const rawAnswer = answers[act.id];
      let displayAnswer = '—';
      
      if (rawAnswer !== undefined && rawAnswer !== '') {
        switch (act.type) {
          case 'multiple_choice': {
            const options = act.config?.options_en || act.config?.options || [];
            const selectedIndex = parseInt(rawAnswer, 10);
            displayAnswer = (selectedIndex >= 0 && selectedIndex < options.length) 
              ? options[selectedIndex] 
              : rawAnswer;
            break;
          }
          case 'gap_fill_dropdown': {
            const indices = rawAnswer.split(',').map(s => parseInt(s.trim(), 10));
            const options = act.config?.dropdownOptions || [];
            const selectedWords = indices.map((idx, i) => {
              const opts = options[i] || [];
              return (idx >= 0 && idx < opts.length) ? opts[idx] : '—';
            });
            displayAnswer = selectedWords.join(', ');
            break;
          }
          case 'sentence_jumble': {
            const indices = rawAnswer.split(',').map(s => parseInt(s.trim(), 10));
            const words = act.config?.words || [];
            const orderedWords = indices.map(idx => {
              const word = words[idx] || '?';
              return stripPunctuation(word);
            });
            displayAnswer = orderedWords.join(' ');
            break;
          }
          case 'vocabulary_matching': {
            try {
              const matches = JSON.parse(rawAnswer);
              const pairs = act.config?.pairs || [];
              const matchStrings = Object.entries(matches)
                .filter(([termIdx, defIdx]) => {
                  const t = parseInt(termIdx, 10);
                  const d = parseInt(defIdx, 10);
                  return !isNaN(t) && !isNaN(d) && t >= 0 && t < pairs.length && d >= 0 && d < pairs.length;
                })
                .map(([termIdx, defIdx]) => {
                  const t = parseInt(termIdx, 10);
                  const d = parseInt(defIdx, 10);
                  return `${pairs[t].term} → ${pairs[d].definition}`;
                });
              const wrongMatches = Object.entries(matches)
                .filter(([termIdx, defIdx]) => {
                  const d = parseInt(defIdx, 10);
                  return d === -1;
                })
                .map(([termIdx]) => {
                  const t = parseInt(termIdx, 10);
                  return `${pairs[t].term} → (wrong attempt)`;
                });
              const allMatches = [...matchStrings, ...wrongMatches];
              displayAnswer = allMatches.length > 0 ? allMatches.join('; ') : 'No matches made';
            } catch {
              displayAnswer = rawAnswer;
            }
            break;
          }
          case 'listening': {
            try {
              const answersObj = JSON.parse(rawAnswer);
              const questions = act.config?.questions || [];
              const parts = Object.entries(answersObj)
                .filter(([qIdx, val]) => val !== undefined && val !== -1)
                .map(([qIdx, val]) => {
                  const q = questions[parseInt(qIdx)] || {};
                  const opt = q.options ? q.options[val] : (val === 0 ? 'True' : 'False');
                  return `Q${parseInt(qIdx) + 1}: ${opt}`;
                });
              displayAnswer = parts.length > 0 ? parts.join('; ') : 'No answers';
            } catch {
              displayAnswer = rawAnswer;
            }
            break;
          }
          case 'dictation':
            displayAnswer = rawAnswer;
            break;
          case 'gap_fill':
          case 'short_answer':
          case 'reasoning':
          default:
            displayAnswer = rawAnswer;
            break;
        }
      }

      const gradedKey = act.id + '_graded';
      const graded = answers[gradedKey];
      let statusText = '';
      let statusClass = '';
      let scoreDisplay = '';

      const autoGradedTypes = ['gap_fill', 'multiple_choice', 'gap_fill_dropdown', 'sentence_jumble', 'vocabulary_matching', 'listening', 'dictation'];

      if (autoGradedTypes.includes(act.type)) {
        if (graded) {
          const earned = graded.score || 0;
          const max = graded.maxScore || 0;
          const percent = max > 0 ? (earned / max) * 100 : 0;
          scoreDisplay = `${earned}/${max}`;

          if (percent === 100) {
            statusText = t.statusFull;
            statusClass = 'bg-green-100 text-green-700';
          } else if (percent === 0) {
            statusText = t.statusZero;
            statusClass = 'bg-red-100 text-red-700';
          } else {
            statusText = t.statusPartial;
            statusClass = 'bg-yellow-100 text-yellow-700';
          }
        } else {
          statusText = t.statusNoGrade;
          statusClass = 'bg-gray-100 text-gray-700';
          scoreDisplay = '?/0';
        }
      } else {
        statusText = t.statusReview;
        statusClass = 'bg-blue-100 text-blue-700';
        scoreDisplay = '';
      }

      const promptForDisplay = (language === 'en' ? act.prompt_en : act.prompt_ja) || act.prompt || '';
      return { qNum, prompt: promptForDisplay, answer: displayAnswer, statusText, statusClass, scoreDisplay };
    });

    return (
      <div className="min-h-screen p-6 bg-warm-50">
        <div className="max-w-2xl mx-auto card p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-warm-900 mb-2">
              {t.wellDone}
            </h2>
            {score !== null && (
              <div className="inline-block bg-primary-100 text-primary-800 text-2xl font-bold px-6 py-3 rounded-full mt-2">
                {score}%
              </div>
            )}
            <p className="text-warm-600 mt-4">
              {t.thankYou}
            </p>

            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="mt-6 btn-primary"
            >
              {showAnswers ? t.hideAnswers : t.seeAnswers}
            </button>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-card text-sm text-yellow-800">
              {t.integrityWarning}
            </div>
          </div>

          {showAnswers && (
            <div className="mt-6 border-t border-warm-200 pt-4">
              <h3 className="text-lg font-semibold text-warm-900 mb-2">{t.yourAnswers}</h3>
              <div
                className="space-y-3 max-h-96 overflow-y-auto select-none no-copy"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {answerSummary.map((item) => (
                  <div key={item.qNum} className="text-sm border-b border-warm-100 pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-warm-700">Q{item.qNum}:</span>
                      <span className="text-warm-600 flex-1">{item.prompt}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 pl-4">
                      <span className="text-warm-500 text-xs">{t.yourAnswerLabel}</span>
                      <span className="font-mono text-sm text-warm-800 flex-1 ml-2">
                        {item.answer}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {item.scoreDisplay && (
                          <span className="text-xs font-mono text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                            {item.scoreDisplay}
                          </span>
                        )}
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full whitespace-nowrap ${item.statusClass}`}>
                          {item.statusText}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- No sections ----------
  if (!sections || sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-warm-50">
        <div className="card p-6 bg-yellow-50 border border-yellow-200 max-w-md text-center text-yellow-700">
          <p>This lesson has no sections yet.</p>
        </div>
      </div>
    );
  }

  // ---------- Main player ----------
  const currentSection = sections[currentPage] || null;
  const totalPages = sections.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const sectionTitle = currentSection?.title || '';
  let sectionIntro = '';
  if (language === 'en') {
    sectionIntro = currentSection?.intro_text_en || currentSection?.intro_text || '';
  } else {
    sectionIntro = currentSection?.intro_text_ja || currentSection?.intro_text_en || currentSection?.intro_text || '';
  }

  return (
    <div className="min-h-screen bg-warm-50 pb-32 md:pb-8">
      <header className="sticky-header sticky top-0 z-30 px-4 py-3 md:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/sel.png" alt="SEL Logo" className="h-10 w-auto flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-warm-900 truncate">
                {lesson.title}
              </h1>
              <p className="text-sm md:text-base font-semibold text-primary-700 truncate">
                {isPreview ? '🔍 PREVIEW MODE' : `👤 ${studentName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => {
                const newLang = language === 'en' ? 'ja' : 'en';
                setLanguage(newLang);
                localStorage.setItem('preferred_language', newLang);
              }}
              className="text-xs bg-warm-200 hover:bg-warm-300 px-2 py-1 rounded-full transition"
            >
              {language === 'en' ? '日本語' : 'English'}
            </button>
            <span className="text-xs font-medium text-warm-500 bg-warm-100 px-3 py-1 rounded-full whitespace-nowrap">
              {currentPage + 1} / {totalPages}
            </span>
            {!isPreview && submissionId && (
              <SaveExitButton
                onSave={handleSaveAndExit}
                isLoading={false}
                slug={slug}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
        {currentSection && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-2">
                {renderInline(sectionTitle)}
              </h2>
              {sectionIntro && (
                <div className="text-warm-600 text-base md:text-lg prose prose-gray max-w-none">
                  {renderInline(sectionIntro)}
                </div>
              )}
            </div>

            <div ref={activitiesContainerRef} className="space-y-6">
              {(currentSection.activities || []).map((activity, idx) => {
                return (
                  <div
                    key={activity.id}
                    className="activity-card p-4 md:p-6"
                  >
                    {renderActivity(activity, idx)}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {!isFirstPage && (
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  className="flex-1 btn-secondary py-3 text-base"
                >
                  ← Previous
                </button>
              )}

              {isLastPage ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isPreview || !submissionId || isSubmitting}
                  className={`flex-1 py-3 px-6 rounded-btn font-medium text-base transition min-h-[48px] ${
                    isPreview || !submissionId || isSubmitting
                      ? 'bg-warm-100 text-warm-400 cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : '📤 Submit Lesson'}
                </button>
              ) : (
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  className="flex-1 btn-primary py-3 text-base"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <ReferenceDrawer
        lesson={lesson}
        audioUrl={lesson?.audio_url}
        imageUrls={lesson?.images || []}
        vocabulary={vocabulary}
      />
    </div>
  );
}