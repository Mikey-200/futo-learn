/**
 * FUTO Learn — AI Service
 * Uses Groq API (openai/gpt-oss-20b) for fast, free lesson + quiz generation.
 *
 * Groq free tier: No billing required, 30 RPM / 1,000 RPD.
 * API is OpenAI-compatible — simple chat completions format.
 *
 * Scanned PDF OCR still uses Gemini Files API (see fileService.js).
 * Includes exponential backoff retry for 429 and 503 responses.
 */

import Config from 'react-native-config';

const API_KEY = Config.GROQ_API_KEY || '';
const MODEL = 'openai/gpt-oss-20b'; // Groq free-tier model (Llama retired Aug 2026)
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Retry helper ─────────────────────────────────────────────────────────────

const withRetry = async (fn, maxRetries = 3) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();
    if (result?.retryable !== true) {return result;}
    if (attempt < maxRetries) {
      const waitMs = [5000, 15000, 30000][attempt] ?? 30000;
      const reason = result?.retryReason || 'busy';
      console.log(`[AIService] ${reason} — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(res => setTimeout(res, waitMs));
    }
  }
  return {
    success: false,
    error: 'Still getting rate limited after several retries. Please wait a minute and try again.',
  };
};

// ─── Groq API call helper ─────────────────────────────────────────────────────

const callGroq = async (prompt, maxTokens = 8192) => {
  return withRetry(async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{role: 'user', content: prompt}],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn('[AIService] Groq API error:', response.status, errorBody);
        if (response.status === 429 || response.status === 503) {
          return {retryable: true, retryReason: response.status === 429 ? 'Rate limited (429)' : 'Overloaded (503)'};
        }
        if (response.status === 401) {
          return {success: false, error: 'Invalid Groq API key. Please check your GROQ_API_KEY in .env.'};
        }
        return {success: false, error: `Generation failed (Error ${response.status}). Please try again.`};
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text || text.trim().length === 0) {
        return {success: false, error: 'The AI returned an empty response. Please try again.'};
      }
      return {success: true, content: text};
    } catch (err) {
      console.warn('[AIService] Network error:', err);
      return {
        success: false,
        error: err.message?.includes('network') || err.message?.includes('fetch')
          ? 'No internet connection. Please connect to generate content.'
          : 'An unexpected error occurred. Please try again.',
      };
    }
  });
};

// ─── Lesson Prompt Builder ────────────────────────────────────────────────────

/**
 * Build the lesson generation prompt.
 * @param {string} materialTitle
 * @param {string} extractedText
 * @param {string} knowledgeLevel  - 'some_understanding' | 'no_knowledge' | 'custom'
 * @param {object} [options]
 * @param {string} [options.priorKnowledge]  - user's custom description of what they already know
 * @param {string} [options.learningGoal]    - what the user specifically wants to understand
 * @param {string} [options.focusPrompt]     - regeneration focus instruction
 */
const buildLessonPrompt = (materialTitle, extractedText, knowledgeLevel, options = {}) => {
  const {priorKnowledge, learningGoal, focusPrompt} = options;

  // Build the knowledge context block
  let levelContext;
  if (priorKnowledge || learningGoal) {
    // Custom description provided by user
    levelContext = [
      priorKnowledge
        ? `The student describes their current knowledge as: "${priorKnowledge}".`
        : null,
      learningGoal
        ? `The student specifically wants to understand: "${learningGoal}". Make sure to address this directly.`
        : null,
    ].filter(Boolean).join(' ');
  } else {
    levelContext = knowledgeLevel === 'some_understanding'
      ? 'The student has some prior understanding of this topic. Build on foundational knowledge, go deeper, use precise terminology but still explain clearly.'
      : 'The student has no prior knowledge of this topic. Start from absolute zero, use simple language and relatable analogies.';
  }

  // Focus instruction for regeneration
  const focusBlock = focusPrompt
    ? `\n**Special Focus for This Version:**\n${focusPrompt}\nMake sure this version specifically addresses the above.\n`
    : '';

  // Truncate content to stay within free-tier token limits
  const truncatedText = extractedText.length > 8000
    ? extractedText.slice(0, 8000) + '\n\n[...content truncated for processing...]'
    : extractedText;

  return `You are an expert educational tutor creating a structured lesson for a university student in Nigeria.

**Course Material Title:** ${materialTitle}

**Student's Knowledge Level:** ${levelContext}
${focusBlock}
**Uploaded Course Content:**
---
${truncatedText}
---

**Your Task:**
Using the course content above as your primary source, create a comprehensive, well-structured lesson that teaches this topic clearly and engagingly.

**Requirements:**
- Make every concept explicit and easy to understand
- Use real-world examples and analogies relevant to everyday life
- Structure the content clearly with headings and sub-sections
- If the uploaded material is thin, fill in gaps with accurate knowledge
- Where concepts have practical applications, explain them
- End with a concise summary of the key points

**Output Format (use Markdown):**
# [Lesson Title based on the material]

## 📖 Introduction
[Brief, engaging introduction to the topic]

## 🔑 Key Concepts
[Core ideas explained clearly, one by one]

## 📚 Detailed Explanation
[In-depth breakdown with examples and analogies]

## 💡 Real-World Applications
[How this knowledge is used in practice]

## ✅ Summary
[Bullet-point summary of everything covered]

---
*Lesson generated by FUTO Learn AI Tutor*`;
};

// ─── generateLesson ───────────────────────────────────────────────────────────

/**
 * Generate a structured lesson from course material.
 *
 * @param {string} materialTitle
 * @param {string} extractedText
 * @param {string} knowledgeLevel - 'some_understanding' | 'no_knowledge' | 'custom'
 * @param {object} [options]
 * @param {string} [options.priorKnowledge]  - user's custom prior knowledge description
 * @param {string} [options.learningGoal]    - what user wants to specifically learn
 * @param {string} [options.focusPrompt]     - regeneration focus instruction
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export const generateLesson = async (materialTitle, extractedText, knowledgeLevel, options = {}) => {
  if (!API_KEY) {
    return {success: false, error: 'No API key configured. Please add your GROQ_API_KEY to .env.'};
  }
  const prompt = buildLessonPrompt(materialTitle, extractedText, knowledgeLevel, options);
  return callGroq(prompt, 8192);
};

// ─── generateQuiz ─────────────────────────────────────────────────────────────

/**
 * Generate a multiple-choice quiz from course material.
 *
 * @param {string} materialTitle
 * @param {string} extractedText
 * @returns {Promise<{success: boolean, questions?: Array, error?: string}>}
 *
 * Question shape:
 * { question: string, options: string[4], correct: 0|1|2|3, explanation: string }
 */
export const generateQuiz = async (materialTitle, extractedText) => {
  if (!API_KEY) {
    return {success: false, error: 'No API key configured. Please add your GROQ_API_KEY to .env.'};
  }

  const truncatedText = extractedText.length > 6000
    ? extractedText.slice(0, 6000) + '\n\n[...content truncated...]'
    : extractedText;

  const prompt = `You are an expert educator creating a multiple-choice quiz for a university student in Nigeria.

**Course Material Title:** ${materialTitle}

**Course Content:**
---
${truncatedText}
---

**Task:** Generate exactly 7 multiple-choice questions that test understanding of this material.

**CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no code block. Start your response with [ and end with ].**

Each question must follow this exact structure:
{
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "One sentence explaining why this answer is correct."
}

Rules:
- "correct" is the 0-based index of the correct option (0, 1, 2, or 3)
- Questions must be specific to the content provided
- Make all 4 options plausible — avoid obviously wrong options
- Vary difficulty: some easy, some medium, some hard
- Explanation must be clear and educational

Return ONLY the JSON array of 7 questions. Nothing else.`;

  const result = await callGroq(prompt, 3000);
  if (!result.success) {return result;}

  // Parse the JSON response robustly
  try {
    let raw = result.content.trim();

    // Strip any markdown code block wrapping (e.g. ```json ... ```)
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extract the JSON array even if there's text before/after it
    const arrayStart = raw.indexOf('[');
    const arrayEnd = raw.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      raw = raw.slice(arrayStart, arrayEnd + 1);
    }

    const questions = JSON.parse(raw);

    // Validate the structure
    if (!Array.isArray(questions) || questions.length === 0) {
      return {success: false, error: 'AI returned an invalid quiz format. Please try again.'};
    }

    const validated = questions.filter(q =>
      q.question &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correct === 'number' &&
      q.correct >= 0 && q.correct <= 3 &&
      q.explanation,
    );

    if (validated.length < 3) {
      return {success: false, error: 'AI could not generate enough valid questions. Please try again.'};
    }

    return {success: true, questions: validated};
  } catch (parseErr) {
    console.warn('[AIService] Quiz JSON parse error:', parseErr, '\nRaw:', result.content?.slice(0, 200));
    return {success: false, error: 'Could not parse quiz response. Please try again.'};
  }
};
