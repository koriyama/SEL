// src/lib/api.js
import { supabase } from './supabaseClient'

// ---------- helpers ----------
function makeSlug() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

function assertNoError(error, context) {
  if (error) {
    console.error(context, error)
    throw new Error(`${context}: ${error.message}`)
  }
}

// ---------- RLS session variable for student operations (with retry) ----------
export async function setStudentName(name) {
  if (!name) {
    console.warn('⚠️ setStudentName called with empty name');
    return;
  }
  console.log('🔐 Setting session variable app.current_student_name =', name);
  
  let attempt = 0;
  const maxAttempts = 3;
  let lastError = null;
  
  while (attempt < maxAttempts) {
    try {
      const result = await supabase.rpc('set_config', {
        parameter: 'app.current_student_name',
        value: name,
      });
      console.log('✅ set_config result:', result);
      return;
    } catch (err) {
      lastError = err;
      attempt++;
      console.warn(`⚠️ setStudentName attempt ${attempt}/${maxAttempts} failed:`, err);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }
  console.error('❌ setStudentName failed after all attempts:', lastError);
  throw new Error(`Failed to set student name: ${lastError.message}`);
}

// ---------- Insert submission via RPC ----------
export async function insertSubmissionViaRpc(lessonId, studentIdentifier, attemptNumber, currentPage, answers, status) {
  const { data, error } = await supabase.rpc('insert_submission', {
    p_lesson_id: lessonId,
    p_student_identifier: studentIdentifier,
    p_attempt_number: attemptNumber,
    p_current_page: currentPage || 0,
    p_answers: answers || {},
    p_status: status || 'in_progress'
  });
  if (error) {
    console.error('❌ insert_submission RPC error:', error);
    const err = new Error(error.message);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    throw err;
  }
  if (!data) {
    throw new Error('insert_submission returned no data');
  }
  return data;
}

// ---------- Get submission by lesson + student ----------
export async function getSubmissionByLessonStudent(lessonId, studentIdentifier) {
  const { data, error } = await supabase.rpc('get_submission_by_lesson_student', {
    p_lesson_id: lessonId,
    p_student_identifier: studentIdentifier
  });
  if (error) {
    console.error('❌ get_submission_by_lesson_student RPC error:', error);
    throw error;
  }
  return data;
}

// ---------- lessons ----------
export async function listLessonsWithStats(userId) {
  if (!userId) throw new Error('User ID required to list lessons')

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  assertNoError(error, 'Failed to load lessons')

  const lessonIds = lessons.map(l => l.id)
  let submissions = []
  if (lessonIds.length > 0) {
    const { data, error: subError } = await supabase
      .from('submissions')
      .select('lesson_id, status, score, max_auto_score')
      .in('lesson_id', lessonIds)
    assertNoError(subError, 'Failed to load submission stats')
    submissions = data || []
  }

  const statsByLesson = {}
  for (const s of submissions) {
    const bucket = (statsByLesson[s.lesson_id] ||= { completed: 0, scoreSum: 0, maxSum: 0 })
    if (s.status === 'completed') {
      bucket.completed += 1
      bucket.scoreSum += s.score || 0
      bucket.maxSum += s.max_auto_score || 0
    }
  }

  return (lessons || []).map((lesson) => {
    const stats = statsByLesson[lesson.id] || { completed: 0, scoreSum: 0, maxSum: 0 }
    const avgPercent = stats.maxSum > 0 ? Math.round((stats.scoreSum / stats.maxSum) * 100) : null
    return { ...lesson, completedCount: stats.completed, avgPercent }
  })
}

export async function getLesson(id) {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()
  assertNoError(error, 'Failed to load lesson')
  return data
}

export async function getLessonBySlug(slug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('share_slug', slug)
    .eq('status', 'published')
    .single()
  assertNoError(error, 'Lesson not found or not published')
  return data
}

export async function getDraftLessonBySlug(slug) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('share_slug', slug)
    .single()
  assertNoError(error, 'Lesson not found')
  return data
}

export async function createLesson(fields, userId, folderId = null) {
  if (!userId) throw new Error('User ID required to create lesson')

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title: fields.title || 'Untitled lesson',
      level: fields.level || 'B1',
      reading_text: fields.reading_text || '',
      audio_url: fields.audio_url || null,
      images: fields.images || [],
      status: 'draft',
      share_slug: makeSlug(),
      user_id: userId,
      folder_id: folderId || null,
      is_public: fields.is_public || false
    })
    .select()
    .single()
  assertNoError(error, 'Failed to create lesson')
  return data
}

export async function updateLesson(id, patch) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  assertNoError(error, 'Failed to update lesson')
  return data
}

export async function setLessonStatus(id, status) {
  return updateLesson(id, { status })
}

// ---------- OPTIMISED duplicateLesson ----------
export async function duplicateLesson(id, userId, folderId = null) {
  if (!userId) throw new Error('User ID required')

  // 1. Fetch the original lesson
  const original = await getLesson(id)

  // 2. Create the copy (lesson only)
  const copy = await createLesson({
    title: `${original.title} (copy)`,
    level: original.level,
    reading_text: original.reading_text,
    audio_url: original.audio_url,
    images: original.images,
    is_public: false  // always private for copies
  }, userId, folderId)

  // 3. Fetch all sections, activities, vocabulary in ONE go (using the lesson ID)
  // Instead of 3 separate queries, we can use a single query with joins,
  // but the current API uses separate functions. We'll keep them separate for clarity,
  // but batch them with Promise.all for parallel execution.
  const [sections, activities, vocabulary] = await Promise.all([
    listSections(id),
    listActivities(id),
    listVocabulary(id)
  ])

  // 4. Prepare new sections (with new IDs, but keep the same data)
  const newSections = sections.map((s, index) => ({
    lesson_id: copy.id,
    title: s.title || '',
    intro_text: s.intro_text || '',
    intro_text_en: s.intro_text_en || '',
    intro_text_ja: s.intro_text_ja || '',
    position: index
  }))

  // 5. Insert sections in batch
  let savedSections = []
  if (newSections.length) {
    const { data, error } = await supabase
      .from('sections')
      .insert(newSections)
      .select()
    assertNoError(error, 'Failed to copy sections')
    savedSections = data
  }

  // Map old section ID to new section ID
  const sectionIdMap = {}
  sections.forEach((old, i) => {
    if (savedSections[i]) {
      sectionIdMap[old.id] = savedSections[i].id
    }
  })

  // 6. Prepare new activities with correct section_id mapping
  const firstSectionId = savedSections.length > 0 ? savedSections[0].id : null
  const newActivities = activities.map((act) => {
    // Deep copy config to avoid mutation
    const configCopy = JSON.parse(JSON.stringify(act.config || {}))
    // Ensure audio_url is preserved in both places
    const audioUrl = act.audio_url || configCopy.audio_url || null
    return {
      lesson_id: copy.id,
      section_id: act.section_id ? sectionIdMap[act.section_id] || firstSectionId : firstSectionId,
      type: act.type,
      prompt: act.prompt || null,
      prompt_en: act.prompt_en || null,
      prompt_ja: act.prompt_ja || null,
      config: configCopy,
      points: act.points ?? 1,
      position: act.position ?? 0,
      audio_url: audioUrl
    }
  })

  // 7. Insert activities in batch
  if (newActivities.length) {
    const { data, error } = await supabase
      .from('activities')
      .insert(newActivities)
      .select()
    assertNoError(error, 'Failed to copy activities')
    // We don't need the returned data, but we keep it for consistency
  }

  // 8. Prepare new vocabulary
  const newVocabulary = vocabulary.map((v, index) => ({
    lesson_id: copy.id,
    term: v.term,
    definition: v.definition,
    example: v.example || '',
    position: index
  }))

  // 9. Insert vocabulary in batch
  if (newVocabulary.length) {
    const { error } = await supabase
      .from('vocabulary')
      .insert(newVocabulary)
    assertNoError(error, 'Failed to copy vocabulary')
  }

  return copy
}

// ---------- sections ----------
export async function listSections(lessonId) {
  const { data, error } = await supabase
    .from('sections')
    .select(`
      *,
      activities:activities(
        id,
        type,
        prompt,
        prompt_en,
        prompt_ja,
        config,
        points,
        position,
        section_id,
        audio_url
      )
    `)
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
  
  if (error) {
    console.error('❌ Error in listSections:', error);
    throw new Error(`Failed to load sections: ${error.message}`)
  }
  
  const sections = (data || []).map(section => ({
    ...section,
    activities: (section.activities || []).sort((a, b) => (a.position || 0) - (b.position || 0))
  }))
  
  console.log('📚 listSections returned:', sections.length, 'sections')
  return sections || []
}

export async function saveSections(lessonId, sections) {
  const { error: deleteError } = await supabase.from('sections').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old sections')

  if (!sections.length) return []

  const rows = sections.map((s, index) => ({
    lesson_id: lessonId,
    title: s.title || '',
    intro_text: s.intro_text || '',
    intro_text_en: s.intro_text_en || '',
    intro_text_ja: s.intro_text_ja || '',
    position: index
  }))

  const { data, error } = await supabase.from('sections').insert(rows).select()
  assertNoError(error, 'Failed to save sections')
  return [...data].sort((a, b) => a.position - b.position)
}

// ---------- activities ----------
export async function listActivities(lessonId) {
  console.log('🔎 listActivities called with lessonId:', lessonId);
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true });
  if (error) {
    console.error('❌ Supabase error in listActivities:', error);
    throw new Error(`Failed to load activities: ${error.message}`)
  }
  console.log('📊 listActivities returned:', data?.length || 0, 'activities');
  return data || []
}

export async function saveActivities(lessonId, activities, force = false) {
  const { error: deleteError } = await supabase.from('activities').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old activities')

  if (!activities.length) return []

  const rows = activities.map((a, index) => {
    const audioUrl = a.audio_url || a.config?.audio_url || null;
    return {
      lesson_id: lessonId,
      section_id: a.section_id ?? null,
      type: a.type,
      prompt: a.prompt || null,
      prompt_en: a.prompt_en || null,
      prompt_ja: a.prompt_ja || null,
      config: a.config || {},
      points: a.points ?? 1,
      position: index,
      audio_url: audioUrl
    }
  })

  console.log('💾 Saving activities with audio_urls:', rows.map(r => ({ id: r.id, audio_url: r.audio_url })))
  const { data, error } = await supabase.from('activities').insert(rows).select()
  assertNoError(error, 'Failed to save activities')
  return data
}

// ---------- vocabulary ----------
export async function listVocabulary(lessonId) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
  assertNoError(error, 'Failed to load vocabulary')
  return data || []
}

export async function saveVocabulary(lessonId, items) {
  const { error: deleteError } = await supabase.from('vocabulary').delete().eq('lesson_id', lessonId)
  assertNoError(deleteError, 'Failed to clear old vocabulary')

  if (!items.length) return []

  const rows = items.map((v, index) => ({
    lesson_id: lessonId,
    term: v.term,
    definition: v.definition,
    example: v.example || '',
    position: index
  }))

  const { data, error } = await supabase.from('vocabulary').insert(rows).select()
  assertNoError(error, 'Failed to save vocabulary')
  return data
}

// ---------- storage ----------
export async function uploadAudio(file) {
  if (!file) {
    console.error('❌ uploadAudio called with no file');
    throw new Error('No file provided')
  }
  console.log('📤 Uploading audio:', file.name, file.size, 'bytes');
  
  const path = `audio/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-media').upload(path, file, { 
    upsert: false,
    cacheControl: '3600'
  })
  
  if (error) {
    console.error('❌ Supabase upload error:', error)
    throw new Error(`Failed to upload audio: ${error.message}`)
  }
  
  const { data } = supabase.storage.from('lesson-media').getPublicUrl(path)
  console.log('✅ Audio uploaded, URL:', data.publicUrl)
  return data.publicUrl
}

export async function uploadImage(file) {
  const path = `images/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lesson-media').upload(path, file, { upsert: false })
  assertNoError(error, 'Failed to upload image')
  const { data } = supabase.storage.from('lesson-media').getPublicUrl(path)
  return data.publicUrl
}

// ---------- submissions & responses ----------
export async function startSubmission(lessonId, studentIdentifier) {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      lesson_id: lessonId,
      student_identifier: studentIdentifier,
      status: 'in_progress',
      answers: {}
    })
    .select()
    .single()
  assertNoError(error, 'Failed to start submission')
  return data
}

export async function completeSubmission(submissionId, { score, maxAutoScore, responses }) {
  const { error: responseError } = await supabase.from('responses').insert(
    responses.map((r) => ({
      submission_id: submissionId,
      activity_id: r.activityId,
      response_text: r.responseText,
      auto_correct: r.autoCorrect,
      auto_score: r.score
    }))
  )
  assertNoError(responseError, 'Failed to save responses')

  const { data, error } = await supabase
    .from('submissions')
    .update({
      status: 'completed',
      submitted_at: new Date().toISOString(),
      score,
      max_auto_score: maxAutoScore
    })
    .eq('id', submissionId)
    .select()
    .single()
  assertNoError(error, 'Failed to complete submission')
  return data
}

export async function getResultsForLesson(lessonId) {
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false })
  assertNoError(error, 'Failed to load submissions')

  const ids = (submissions || []).map((s) => s.id)
  let responses = []
  if (ids.length) {
    const { data, error: respError } = await supabase
      .from('responses')
      .select('*, activities(prompt, type)')
      .in('submission_id', ids)
    assertNoError(respError, 'Failed to load responses')
    responses = data || []
  }

  return (submissions || []).map((s) => ({
    ...s,
    responses: responses.filter((r) => r.submission_id === s.id)
  }))
}

// ---------- Save & Exit ----------
export async function saveLessonProgress(lessonId, currentSectionIndex, currentActivityIndex, draftAnswers) {
  const user = { id: 'test-user' };
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id: lessonId,
      current_section_index: currentSectionIndex,
      current_activity_index: currentActivityIndex || 0,
      draft_answers: draftAnswers,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, lesson_id'
    })
    .select()
    .single();
  assertNoError(error, 'Failed to save lesson progress')
  return data
}

export async function getLessonProgress(lessonId) {
  const user = { id: 'test-user' };
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data
}

// ---------- folders ----------
export async function listFolders(userId) {
  if (!userId) throw new Error('User ID required to list folders')
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  assertNoError(error, 'Failed to load folders')
  return data || []
}

export async function createFolder(name, userId) {
  if (!userId) throw new Error('User ID required to create folder')
  const { data, error } = await supabase
    .from('folders')
    .insert({ name: name.trim(), user_id: userId })
    .select()
    .single()
  assertNoError(error, 'Failed to create folder')
  return data
}

export async function updateLessonFolder(lessonId, folderId) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ folder_id: folderId || null, updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to update lesson folder')
  return data
}

export async function deleteFolder(folderId) {
  const { error } = await supabase.from('folders').delete().eq('id', folderId)
  assertNoError(error, 'Failed to delete folder')
  return true
}

export async function reorderFolders(folderIds) {
  for (let i = 0; i < folderIds.length; i++) {
    const { error } = await supabase.from('folders').update({ position: i }).eq('id', folderIds[i])
    assertNoError(error, 'Failed to reorder folders')
  }
  return true
}

export async function renameFolder(folderId, newName) {
  const { data, error } = await supabase.from('folders').update({ name: newName.trim() }).eq('id', folderId).select().single()
  assertNoError(error, 'Failed to rename folder')
  return data
}

export async function bulkMoveLessons(lessonIds, folderId) {
  const { error } = await supabase
    .from('lessons')
    .update({ folder_id: folderId || null, updated_at: new Date().toISOString() })
    .in('id', lessonIds)
  assertNoError(error, 'Failed to move lessons')
  return true
}

export async function renameLesson(lessonId, newTitle) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to rename lesson')
  return data
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
  assertNoError(error, 'Failed to delete lesson')
  return true
}

export async function deleteLessons(lessonIds) {
  if (!lessonIds || lessonIds.length === 0) return true;
  const { error } = await supabase.from('lessons').delete().in('id', lessonIds);
  assertNoError(error, 'Failed to delete lessons');
  return true;
}

export async function deleteSubmissions(submissionIds) {
  if (!submissionIds || submissionIds.length === 0) return true
  const { error } = await supabase.from('submissions').delete().in('id', submissionIds)
  assertNoError(error, 'Failed to delete submissions')
  return true
}

export async function getNextAttemptNumber(lessonId, studentIdentifier) {
  const { data, error } = await supabase
    .from('submissions')
    .select('attempt_number')
    .eq('lesson_id', lessonId)
    .eq('student_identifier', studentIdentifier)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.attempt_number + 1 : 1;
}

export async function saveSubmission(submissionId, updates, studentIdentifier) {
  if (submissionId) {
    try {
      if (studentIdentifier) {
        await setStudentName(studentIdentifier);
      } else {
        console.warn('⚠️ saveSubmission update without studentIdentifier - RLS might fail.');
      }
      const { data, error } = await supabase
        .from('submissions')
        .update(updates)
        .eq('id', submissionId)
        .select()
        .maybeSingle();
      if (error) {
        console.warn('⚠️ Regular update failed, falling back to RPC:', error);
        throw error;
      }
      if (!data) {
        throw new Error('No row updated (regular)');
      }
      return data;
    } catch (err) {
      console.warn('⚠️ Falling back to RPC update_submission due to error:', err.message);
      const { data, error } = await supabase.rpc('update_submission', {
        p_id: submissionId,
        p_updates: updates,
        p_student_name: studentIdentifier
      });
      if (error) {
        console.error('❌ RPC update failed:', error);
        throw new Error(`Failed to update submission via RPC: ${error.message}`);
      }
      if (!data) {
        throw new Error('RPC returned no data');
      }
      return data;
    }
  } else {
    const { data, error } = await supabase
      .from('submissions')
      .insert(updates)
      .select()
      .single();
    if (error) {
      console.error('❌ saveSubmission insert error:', error);
      throw new Error(`Failed to insert submission: ${error.message}`);
    }
    return data;
  }
}

export async function getSubmission(slug, studentName) {
  try {
    const lesson = await getLessonBySlug(slug);
    if (!lesson) return null;
    const normalizedName = studentName.trim();
    const data = await getSubmissionByLessonStudent(lesson.id, normalizedName);
    return data;
  } catch (err) {
    console.error('❌ Exception in getSubmission:', err);
    return null;
  }
}

// ---------- Lesson Library functions ----------
export async function listAllLessons(userId) {
  if (!userId) throw new Error('User ID required to list lessons')
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  assertNoError(error, 'Failed to load lessons')
  return data || []
}

export async function exportLessons(lessonIds) {
  if (!lessonIds || lessonIds.length === 0) return []
  const lessons = []
  for (const id of lessonIds) {
    const lesson = await getLesson(id)
    const sections = await listSections(id)
    const activities = await listActivities(id)
    const vocabulary = await listVocabulary(id)
    lessons.push({
      lesson,
      sections,
      activities,
      vocabulary
    })
  }
  return lessons
}

export async function importLessons(lessonsData, folderId, userId) {
  if (!userId) throw new Error('User ID required')
  if (!lessonsData || !Array.isArray(lessonsData) || lessonsData.length === 0) {
    throw new Error('No lessons to import')
  }
  const imported = []
  for (const item of lessonsData) {
    const { lesson, sections, activities, vocabulary } = item
    if (!lesson) continue

    const newLesson = await createLesson({
      title: lesson.title + ' (imported)',
      level: lesson.level,
      reading_text: lesson.reading_text || '',
      audio_url: lesson.audio_url || null,
      images: lesson.images || [],
      is_public: false // imported lessons are private by default
    }, userId, folderId)

    let savedSections = []
    if (sections && sections.length) {
      savedSections = await saveSections(
        newLesson.id,
        sections.map(({ id, lesson_id, created_at, updated_at, ...rest }) => rest)
      )
    }

    const sectionIdMap = {}
    if (savedSections.length) {
      sections.forEach((old, i) => {
        if (savedSections[i]) sectionIdMap[old.id] = savedSections[i].id
      })
    }

    if (activities && activities.length) {
      const activitiesToSave = activities.map(act => {
        const newSectionId = act.section_id ? sectionIdMap[act.section_id] || null : null
        return {
          ...act,
          id: undefined,
          lesson_id: newLesson.id,
          section_id: newSectionId,
          audio_url: act.audio_url || act.config?.audio_url || null
        }
      })
      await saveActivities(newLesson.id, activitiesToSave, true)
    }

    if (vocabulary && vocabulary.length) {
      const vocabToSave = vocabulary.map(v => ({
        term: v.term,
        definition: v.definition,
        example: v.example || '',
        position: v.position || 0
      }))
      await saveVocabulary(newLesson.id, vocabToSave)
    }

    imported.push(newLesson)
  }
  return imported
}

export async function copyLessonToFolder(lessonId, targetFolderId, userId) {
  if (!userId) throw new Error('User ID required')
  const copy = await duplicateLesson(lessonId, userId, targetFolderId)
  return copy
}

// ---------- Public Library functions ----------
export async function listPublicLessons() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  assertNoError(error, 'Failed to load public lessons')
  return data || []
}

export async function toggleLessonPublic(lessonId, isPublic) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ is_public: isPublic })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to update lesson public status')
  return data
}

// ---------- Auto-share folder functions ----------
export async function moveLessonWithAutoShare(lessonId, folderId, userId) {
  if (!userId) throw new Error('User ID required')
  
  let isShared = false
  if (folderId) {
    const { data: folder } = await supabase
      .from('folders')
      .select('name')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single()
    isShared = folder?.name === 'Shared'
  }
  
  const { data, error } = await supabase
    .from('lessons')
    .update({ 
      folder_id: folderId || null, 
      is_public: isShared || false,
      updated_at: new Date().toISOString()
    })
    .eq('id', lessonId)
    .select()
    .single()
  assertNoError(error, 'Failed to move lesson')
  return data
}

export async function getOrCreateAutoShareFolder(userId) {
  if (!userId) throw new Error('User ID required')
  
  const { data: existing } = await supabase
    .from('folders')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Shared')
    .maybeSingle()
  
  if (existing) return existing.id
  
  const { data, error } = await supabase
    .from('folders')
    .insert({ name: 'Shared', user_id: userId })
    .select()
    .single()
  assertNoError(error, 'Failed to create Shared folder')
  return data.id
}