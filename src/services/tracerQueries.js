import supabase from "./supabase";

/**
 * Get all phases from active forms
 */
export const getTracerForms = async () => {
  try {
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
 * Get a single phase by ID
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
 */
export const getTracerProgress = async (alumniId) => {
  try {
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

export const getOrCreateDraftResponse = async (alumniId, formId) => {
  try {
    console.log("🔍 Looking for response: alumniId=", alumniId, "formId=", formId);

    // 1. Find ANY existing response (in_progress or completed)
    const { data: existing, error: existingError } = await supabase
      .from("tracer_responses")
      .select("*")
      .eq("alumni_id", alumniId)
      .eq("form_id", formId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    // 2. If NO existing response → create new draft
    if (!existing) {
      console.log("📝 No response found, creating NEW draft...");
      return await createNewDraftResponse(alumniId, formId);
    }

    console.log("🔍 Existing response found:", existing.id, "Status:", existing.status);

    // 3. If response is 'in_progress' → return it
    if (existing.status === 'in_progress') {
      console.log("✅ Found in-progress draft:", existing.id);
      return existing;
    }

    // 4. If response is 'completed' → check if there are new questions
    if (existing.status === 'completed') {
      console.log("📝 Checking if completed response needs updating...");
      
      // Get all questions for this form
      const { data: allQuestions, error: questionsError } = await supabase
        .from("tracer_questions")
        .select("id")
        .eq("form_id", formId);

      if (questionsError) throw questionsError;

      // Get all answered questions for this response
      const { data: answers, error: answersError } = await supabase
        .from("tracer_answers")
        .select("question_id")
        .eq("tracer_response_id", existing.id);

      if (answersError) throw answersError;

      const answeredQuestionIds = new Set(answers?.map(a => a.question_id) || []);
      const allQuestionIds = new Set(allQuestions?.map(q => q.id) || []);

      // Check if there are unanswered questions
      const hasUnansweredQuestions = allQuestions?.some(q => !answeredQuestionIds.has(q.id));

      console.log("📊 Unanswered questions:", hasUnansweredQuestions);

      // If ALL questions are answered → response is truly complete
      if (!hasUnansweredQuestions) {
        console.log("✅ All questions answered. Response is complete.");
        return existing;
      }

      // If there are NEW unanswered questions → reopen the response
      console.log("📝 New questions found! Reopening completed response...");
      
      const { data: reopened, error: reopenError } = await supabase
        .from("tracer_responses")
        .update({
          status: "in_progress",
          submitted_at: null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (reopenError) {
        console.error("❌ Reopen error:", reopenError);
        throw reopenError;
      }

      console.log("✅ Response reopened successfully:", reopened.id);
      return reopened;
    }

    // Fallback: create new draft
    return await createNewDraftResponse(alumniId, formId);
  } catch (error) {
    console.error("❌ getOrCreateDraft error:", error.message);
    throw error;
  }
};

/**
 * Helper: Create a new draft response
 */
const createNewDraftResponse = async (alumniId, formId) => {
  try {
    console.log("📝 Creating NEW draft...");
    
    const { data: newDraft, error: createError } = await supabase
      .from("tracer_responses")
      .insert([{
        alumni_id: alumniId,
        form_id: formId,
        status: "in_progress",
      }])
      .select()
      .single();

    if (createError) {
      console.error("❌ Create error:", createError);
      throw createError;
    }

    console.log("✅ New draft created:", newDraft.id);
    return newDraft;
  } catch (error) {
    console.error("❌ createNewDraftResponse error:", error.message);
    throw error;
  }
};

/**
 * Save answer draft
 */
export const saveAnswerDraft = async (responseId, questionId, value, options = {}) => {
  try {
    const { filePath, fileName, gridRowId, selections } = options;

    console.log("💾 Saving answer:", { responseId, questionId, value: value?.substring(0, 30), hasSelections: !!selections });

    const { data: existingData, error: existingError } = await supabase
      .from("tracer_answers")
      .select("id")
      .eq("tracer_response_id", responseId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existingError) throw existingError;

    let answerId;

    if (existingData) {
      console.log("🔄 Updating existing answer:", existingData.id);
      const { error } = await supabase
        .from("tracer_answers")
        .update({
          answer_value: value,
          file_path: filePath || null,
          file_name: fileName || null,
          grid_row_id: gridRowId || null,
        })
        .eq("id", existingData.id);

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }
      answerId = existingData.id;
    } else {
      console.log("➕ Creating new answer...");
      const { data, error } = await supabase
        .from("tracer_answers")
        .insert([{
          tracer_response_id: responseId,
          question_id: questionId,
          answer_value: value,
          file_path: filePath || null,
          file_name: fileName || null,
          grid_row_id: gridRowId || null,
        }])
        .select()
        .single();

      if (error) {
        console.error("❌ Insert error:", error);
        throw error;
      }
      answerId = data.id;
    }

    // Handle selections
    if (selections !== undefined) {
      console.log("🔗 Updating selections for answer:", answerId, selections);
      
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

        if (insertError) {
          console.error("❌ Selections insert error:", insertError);
          throw insertError;
        }
      }
    }

    console.log("✅ Answer saved successfully:", answerId);
    return { id: answerId, question_id: questionId, answer_value: value };
  } catch (error) {
    console.error("❌ saveAnswerDraft error:", error.message, error);
    throw error;
  }
};

/**
 * Get draft answers for a response
 */
export const getDraftAnswers = async (responseId) => {
  try {
    console.log("📖 Fetching draft answers for response:", responseId);
    
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
    
    console.log("📖 Draft answers fetched:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("❌ getDraftAnswers error:", error.message);
    throw error;
  }
};

/**
 * Submit draft response
 */
export const submitDraftResponse = async (responseId) => {
  try {
    console.log("📤 Submitting response:", responseId);
    
    const { data, error } = await supabase
      .from("tracer_responses")
      .update({
        status: "completed",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", responseId)
      .select()
      .single();

    if (error) {
      console.error("❌ Submit error:", error);
      throw error;
    }
    
    console.log("✅ Response submitted successfully:", data?.id);
    return data;
  } catch (error) {
    console.error("❌ submitDraft error:", error.message);
    throw error;
  }
};

export const uploadTracerFile = async (responseId, questionId, file) => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType,
    name: file.name,
  });
  formData.append('response_id', responseId);
  formData.append('question_id', questionId);

  const response = await api.post('/tracer/upload-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return response.data.path;
};