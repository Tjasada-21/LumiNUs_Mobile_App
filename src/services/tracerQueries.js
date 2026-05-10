import supabase from './supabase';
import { normalizeTracerForms, normalizeTracerForm } from './schemaMapper';

export const DRAFT_SUBMITTED_AT_SENTINEL = '1970-01-01T00:00:00.000Z';

/**
 * Tracer Forms & Surveys Queries
 */

/**
 * Get all active tracer forms
 */
export const getActiveForms = async () => {
  try {
    const { data, error } = await supabase
      .from('tracer_forms')
      .select(`
        *,
        admin:admin_id(id, admin_first_name, admin_last_name),
        questions:tracer_questions(
          id,
          type,
          question_text,
          description,
          is_required,
          order_priority,
          settings,
          answer_options:tracer_answer_options(id, option_label, option_value)
        )
      `)
      .eq('status', 1) // 1 = active
      .order('form_title', { ascending: true });

    if (error) throw error;
    return normalizeTracerForms(data || []);
  } catch (error) {
    console.error('[tracer] Get forms error:', error.message);
    throw error;
  }
};

/**
 * Get tracer form by ID
 */
export const getTracerFormById = async (formId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_forms')
      .select(`
        *,
        admin:admin_id(id, admin_first_name, admin_last_name),
        questions:tracer_questions(
          id,
          type,
          question_text,
          description,
          is_required,
          order_priority,
          settings,
          answer_options:tracer_answer_options(id, option_label, option_value)
        )
      `)
      .eq('id', formId)
      .single();

    if (error) throw error;
    return normalizeTracerForm(data);
  } catch (error) {
    console.error('[tracer] Get form error:', error.message);
    throw error;
  }
};

/**
 * Get user's tracer responses
 */
export const getUserTracerResponses = async (alumniId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .select(`
        *,
        form:form_id(id, form_title, form_description),
        answers:tracer_answers(
          id,
          tq_id,
          answer_value,
          question:tracer_questions(id, question_text, type)
        )
      `)
      .eq('alumni_id', alumniId)
      .neq('submitted_at', DRAFT_SUBMITTED_AT_SENTINEL)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[tracer] Get responses error:', error.message);
    throw error;
  }
};

/**
 * Get single response
 */
export const getTracerResponse = async (responseId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .select(`
        *,
        form:form_id(id, form_title, form_description),
        answers:tracer_answers(
          id,
          tq_id,
          answer_value,
          question:tracer_questions(id, question_text, type)
        )
      `)
      .eq('id', responseId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[tracer] Get response error:', error.message);
    throw error;
  }
};

/**
 * Check if user has already submitted a form
 */
export const hasSubmittedForm = async (alumniId, formId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .select('id')
      .eq('alumni_id', alumniId)
      .eq('form_id', formId)
      .neq('submitted_at', DRAFT_SUBMITTED_AT_SENTINEL)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('[tracer] Has submitted error:', error.message);
    throw error;
  }
};

/**
 * Submit tracer form response
 */
export const submitTracerForm = async (alumniId, formId, answers) => {
  try {
    // Create response record
    const { data: responseData, error: responseError } = await supabase
      .from('tracer_responses')
      .insert([{
        alumni_id: alumniId,
        form_id: formId,
        submitted_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (responseError) throw responseError;

    // Insert answers
    const answerRecords = answers.map(ans => ({
      tracer_response_id: responseData.id,
      tq_id: ans.questionId,
      answer_value: ans.value,
    }));

    const { error: answersError } = await supabase
      .from('tracer_answers')
      .insert(answerRecords);

    if (answersError) throw answersError;

    return responseData;
  } catch (error) {
    console.error('[tracer] Submit form error:', error.message);
    throw error;
  }
};

/**
 * Get latest draft response for a form
 */
export const getDraftResponse = async (alumniId, formId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .select('id, alumni_id, form_id, submitted_at, created_at, updated_at')
      .eq('alumni_id', alumniId)
      .eq('form_id', formId)
      .eq('submitted_at', DRAFT_SUBMITTED_AT_SENTINEL)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('[tracer] Get draft response error:', error.message);
    throw error;
  }
};

/**
 * Create draft response row
 */
export const createDraftResponse = async (alumniId, formId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .insert([{
        alumni_id: alumniId,
        form_id: formId,
        submitted_at: DRAFT_SUBMITTED_AT_SENTINEL,
      }])
      .select('id, alumni_id, form_id, submitted_at, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[tracer] Create draft response error:', error.message);
    throw error;
  }
};

/**
 * Get existing draft response or create one
 */
export const getOrCreateDraftResponse = async (alumniId, formId) => {
  try {
    const existing = await getDraftResponse(alumniId, formId);
    if (existing?.id) return existing;
    return await createDraftResponse(alumniId, formId);
  } catch (error) {
    console.error('[tracer] Get or create draft response error:', error.message);
    throw error;
  }
};

/**
 * Get saved draft answers for a response
 */
export const getDraftAnswers = async (responseId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_answers')
      .select('id, tq_id, answer_value')
      .eq('tracer_response_id', responseId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[tracer] Get draft answers error:', error.message);
    throw error;
  }
};

/**
 * Submit an existing draft response
 */
export const submitDraftResponse = async (responseId) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[tracer] Submit draft response error:', error.message);
    throw error;
  }
};

/**
 * Update tracer response
 */
export const updateTracerResponse = async (responseId, updates) => {
  try {
    const { data, error } = await supabase
      .from('tracer_responses')
      .update(updates)
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[tracer] Update response error:', error.message);
    throw error;
  }
};

/**
 * Save answer draft
 */
export const saveAnswerDraft = async (responseId, questionId, value) => {
  try {
    // Check if answer exists
    const { data: existingData, error: existingError } = await supabase
      .from('tracer_answers')
      .select('id')
      .eq('tracer_response_id', responseId)
      .eq('tq_id', questionId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingData) {
      // Update existing
      const { data, error } = await supabase
        .from('tracer_answers')
        .update({ answer_value: value })
        .eq('id', existingData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new
    const { data, error } = await supabase
      .from('tracer_answers')
      .insert([{
        tracer_response_id: responseId,
        tq_id: questionId,
        answer_value: value,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[tracer] Save answer error:', error.message);
    throw error;
  }
};

/**
 * Get form response statistics
 */
export const getFormStatistics = async (formId) => {
  try {
    const { data: responses, error: responsesError } = await supabase
      .from('tracer_responses')
      .select('id')
      .eq('form_id', formId);

    if (responsesError) throw responsesError;

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('tracer_questions')
      .select('id, question_text, type')
      .eq('form_id', formId);

    if (questionsError) throw questionsError;

    // Get answer distribution
    const { data: answers, error: answersError } = await supabase
      .from('tracer_answers')
      .select('tq_id, answer_value')
      .in('tracer_response_id', responses.map(r => r.id));

    if (answersError) throw answersError;

    return {
      totalResponses: responses.length,
      questions: questions.length,
      answers: answers,
    };
  } catch (error) {
    console.error('[tracer] Get statistics error:', error.message);
    throw error;
  }
};
