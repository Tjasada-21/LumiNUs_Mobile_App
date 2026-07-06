import supabase from "./supabase";

export const DRAFT_SUBMITTED_AT_SENTINEL = "1970-01-01T00:00:00.000Z";

/**
 * Get all phases from active forms
 * This is what the TracerMenuScreen needs - a list of phases
 */
export const getTracerForms = async () => {
  try {
    // Get ALL phases directly without form status filtering
    const { data: phases, error } = await supabase
      .from("tracer_phases")
      .select(`
        id,
        form_id,
        title,
        subtitle,
        icon,
        color,
        order_priority,
        sections:tracer_sections(
          id,
          title,
          description,
          order_priority,
          questions:tracer_questions(
            id,
            type,
            question_text,
            is_required,
            order_priority,
            options:tracer_question_options(id, option_label, order_priority),
            grid_rows:tracer_grid_rows(id, row_label, order_priority),
            grid_columns:tracer_grid_columns(id, column_label, order_priority)
          )
        )
      `)
      .order("order_priority", { ascending: true });

    if (error) throw error;

    console.log("[tracer] Phases fetched:", phases?.length || 0);

    // Sort sections and questions
    if (phases) {
      phases.forEach(phase => {
        if (phase.sections) {
          phase.sections.sort((a, b) => a.order_priority - b.order_priority);
          phase.sections.forEach(section => {
            if (section.questions) {
              section.questions.sort((a, b) => a.order_priority - b.order_priority);
            }
          });
        }
      });
    }

    return phases || [];
  } catch (error) {
    console.error("[tracer] Get forms error:", error.message);
    throw error;
  }
};

/**
 * Get a single phase by ID with all its sections and questions
 */
export const getPhaseById = async (phaseId) => {
  try {
    const { data, error } = await supabase
      .from("tracer_phases")
      .select(`
        id,
        form_id,
        title,
        subtitle,
        icon,
        color,
        order_priority,
        sections:tracer_sections(
          id,
          title,
          description,
          order_priority,
          questions:tracer_questions(
            id,
            type,
            question_text,
            description,
            placeholder,
            is_required,
            order_priority,
            file_types,
            max_file_size,
            options:tracer_question_options(id, option_label, order_priority),
            grid_rows:tracer_grid_rows(id, row_label, order_priority),
            grid_columns:tracer_grid_columns(id, column_label, order_priority)
          )
        )
      `)
      .eq("id", phaseId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[tracer] Get phase error:", error.message);
    throw error;
  }
};

/**
 * Get tracer progress for a specific alumni
 * Calculates which sections have been completed across all phases
 */
export const getTracerProgress = async (alumniId) => {
  try {
    // Get the latest response for this alumni (across all forms)
    const { data: response, error: responseError } = await supabase
      .from("tracer_responses")
      .select("id, form_id, status")
      .eq("alumni_id", alumniId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (responseError) throw responseError;
    
    if (!response) {
      return {
        completedSections: 0,
        totalSections: 0,
        completedSectionIds: [],
        status: null,
      };
    }

    // Get all sections for this form
    const { data: phases, error: phasesError } = await supabase
      .from("tracer_phases")
      .select(`
        id,
        sections:tracer_sections(
          id,
          questions:tracer_questions(id)
        )
      `)
      .eq("form_id", response.form_id);

    if (phasesError) throw phasesError;

    // Get answered questions for this response
    const { data: answers, error: answersError } = await supabase
      .from("tracer_answers")
      .select("question_id")
      .eq("tracer_response_id", response.id);

    if (answersError) throw answersError;

    const answeredQuestionIds = new Set(answers?.map(a => a.question_id) || []);
    const completedSectionIds = [];
    let totalSections = 0;

    phases?.forEach(phase => {
      phase.sections?.forEach(section => {
        totalSections++;
        const totalQuestions = section.questions?.length || 0;
        const answeredCount = section.questions?.filter(q => answeredQuestionIds.has(q.id)).length || 0;
        
        if (totalQuestions > 0 && answeredCount >= totalQuestions) {
          completedSectionIds.push(section.id);
        }
      });
    });

    return {
      completedSections: completedSectionIds.length,
      totalSections: totalSections,
      completedSectionIds,
      status: response.status,
      responseId: response.id,
    };
  } catch (error) {
    console.error("[tracer] Get progress error:", error.message);
    return {
      completedSections: 0,
      totalSections: 0,
      completedSectionIds: [],
      status: null,
    };
  }
};

/**
 * Get or create draft response for a form
 */
export const getOrCreateDraftResponse = async (alumniId, formId) => {
  try {
    // Check for existing draft
    const { data: existing, error: existingError } = await supabase
      .from("tracer_responses")
      .select("*")
      .eq("alumni_id", alumniId)
      .eq("form_id", formId)
      .eq("submitted_at", DRAFT_SUBMITTED_AT_SENTINEL)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) return existing;

    // Create new draft
    const { data: newDraft, error: createError } = await supabase
      .from("tracer_responses")
      .insert([
        {
          alumni_id: alumniId,
          form_id: formId,
          status: "in_progress",
          submitted_at: DRAFT_SUBMITTED_AT_SENTINEL,
        },
      ])
      .select()
      .single();

    if (createError) throw createError;
    return newDraft;
  } catch (error) {
    console.error("[tracer] Get or create draft error:", error.message);
    throw error;
  }
};

/**
 * Save answer draft
 */
export const saveAnswerDraft = async (responseId, questionId, value, options = {}) => {
  try {
    const { filePath, fileName, gridRowId, selections } = options;

    // Check if answer exists for this question
    const { data: existingData, error: existingError } = await supabase
      .from("tracer_answers")
      .select("id")
      .eq("tracer_response_id", responseId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existingError) throw existingError;

    let answerId;

    if (existingData) {
      // Update existing answer
      const { error } = await supabase
        .from("tracer_answers")
        .update({
          answer_value: value,
          file_path: filePath || null,
          file_name: fileName || null,
          grid_row_id: gridRowId || null,
        })
        .eq("id", existingData.id);

      if (error) throw error;
      answerId = existingData.id;
    } else {
      // Create new answer
      const { data, error } = await supabase
        .from("tracer_answers")
        .insert([
          {
            tracer_response_id: responseId,
            question_id: questionId,
            answer_value: value,
            file_path: filePath || null,
            file_name: fileName || null,
            grid_row_id: gridRowId || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      answerId = data.id;
    }

    // Handle selections (for multiple choice, checkboxes, grids)
    if (selections !== undefined) {
      await supabase
        .from("tracer_answer_selections")
        .delete()
        .eq("tracer_answer_id", answerId);

      if (selections && selections.length > 0) {
        const selectionRecords = selections.map((sel) => ({
          tracer_answer_id: answerId,
          option_id: sel.optionId || null,
          grid_column_id: sel.gridColumnId || null,
        }));

        const { error: insertError } = await supabase
          .from("tracer_answer_selections")
          .insert(selectionRecords);

        if (insertError) throw insertError;
      }
    }

    return { id: answerId, question_id: questionId, answer_value: value };
  } catch (error) {
    console.error("[tracer] Save answer error:", error.message);
    throw error;
  }
};

/**
 * Get draft answers for a response
 */
export const getDraftAnswers = async (responseId) => {
  try {
    const { data, error } = await supabase
      .from("tracer_answers")
      .select(`
        id,
        question_id,
        answer_value,
        file_path,
        file_name,
        grid_row_id,
        selections:tracer_answer_selections(
          id,
          option_id,
          grid_column_id
        )
      `)
      .eq("tracer_response_id", responseId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[tracer] Get draft answers error:", error.message);
    throw error;
  }
};

/**
 * Submit draft response
 */
export const submitDraftResponse = async (responseId) => {
  try {
    const { data, error } = await supabase
      .from("tracer_responses")
      .update({
        status: "completed",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", responseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[tracer] Submit draft error:", error.message);
    throw error;
  }
};