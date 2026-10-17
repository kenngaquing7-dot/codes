import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Google GenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to check for API key
const checkApiKey = (res: Response): boolean => {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in the environment. Please check the Secrets panel in AI Studio.',
    });
    return false;
  }
  return true;
};

// ==========================================
// 1. AI Tutor Chat Endpoint
// ==========================================
app.post('/api/tutor/chat', async (req: Request, res: Response) => {
  try {
    if (!checkApiKey(res)) return;

    const { messages, subject = 'General', mode = 'comprehensive', studentName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const modePromptMap: Record<string, string> = {
      comprehensive:
        'Deliver a well-structured, clear explanation with intuition, definitions, real-world examples, and key takeaways.',
      socratic:
        'Act like Socrates: guide the student by answering with thoughtful questions and hints that help them discover the answer themselves, while confirming correct intuition.',
      step_by_step:
        'Break down the topic or problem into rigorous numbered steps. Explain "why" for each step, and highlight common pitfalls.',
      analogy:
        'Use intuitive, vivid everyday analogies (e.g., cooking, sports, gaming, nature) to explain complex mechanics simply without losing accuracy.',
      quick_summary:
        'Provide a fast, crisp bulleted summary with high-yield points for quick revision.',
    };

    const systemInstruction = `You are "AI Student Assistance Tutor", an empathetic, highly knowledgeable, and world-class educational tutor.
${studentName ? `Student Name: ${studentName}\n` : ''}Target Subject: ${subject}
Tutoring Style: ${modePromptMap[mode] || modePromptMap.comprehensive}

Pedagogical Guidelines:
1. Explain thoroughly, clearly, and intuitively, adapting naturally to the depth and nuance of the student's question.
2. Structure your response using markdown:
   - Use bold headers (###), bullet points, and code/formula blocks where appropriate.
   - Include a "💡 Core Intuition" or "🔑 Key Takeaway" highlight block.
   - Include practical examples or memory mnemonics when helpful.
3. Keep the tone encouraging, intellectual, friendly, and clear.
4. At the very end of your response, provide exactly 3 suggested follow-up questions or thought prompts that the student can explore next. Enclose them in a JSON-formatted block prefixed by "---FOLLOW_UPS---":
Example format at the bottom:
---FOLLOW_UPS---
["Can you show an example with real numbers?", "How does this connect to X?", "What is a common exam trick question about this?"]`;

    // Format chat history
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const fullText = response.text || '';

    // Split text and suggested follow-ups
    let mainReply = fullText;
    let followUps: string[] = [];

    const delimiter = '---FOLLOW_UPS---';
    if (fullText.includes(delimiter)) {
      const parts = fullText.split(delimiter);
      mainReply = parts[0].trim();
      const followUpSection = parts[1].trim();
      try {
        const cleanedJson = followUpSection.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        if (Array.isArray(parsed)) {
          followUps = parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Fallback: line-by-line parsing
        followUps = followUpSection
          .split('\n')
          .map((line) => line.replace(/^[-*0-9.]+\s*/, '').replace(/["[\]]/g, '').trim())
          .filter((line) => line.length > 5)
          .slice(0, 3);
      }
    }

    res.json({
      reply: mainReply,
      followUps,
    });
  } catch (err: unknown) {
    console.error('Error in /api/tutor/chat:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate tutor response' });
  }
});

// ==========================================
// 2. Practice Quiz Generation Endpoint
// ==========================================
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  try {
    if (!checkApiKey(res)) return;

    const {
      topic = 'General Science',
      difficulty = 'medium',
      questionCount = 5,
      quizType = 'multiple_choice',
      subject = 'General',
    } = req.body;

    const count = Math.min(Math.max(Number(questionCount) || 5, 3), 15);

    const prompt = `Create a high-quality educational practice quiz.
Topic: "${topic}"
Subject Domain: "${subject}"
Difficulty: "${difficulty}" (easy, medium, hard, or expert)
Total Questions: ${count}
Format: ${quizType === 'true_false' ? 'True/False questions only' : quizType === 'multiple_choice' ? '4-option Multiple Choice questions' : 'Mix of Multiple Choice and True/False questions'}

Requirements:
1. Make questions thoughtful, testing deep comprehension, application, or conceptual understanding rather than just trivial trivia.
2. For multiple choice, ensure all 4 options are plausible and clear.
3. correctAnswerIndex must be 0-indexed (0 for first option, 1 for second, etc.).
4. Provide a thorough, educational explanation for why the correct option is right, and explain key traps or why distractors fail.
5. Provide a crisp "keyConcept" or rule statement.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Engaging title for this practice quiz' },
            topic: { type: Type.STRING, description: 'Clean topic name' },
            difficulty: { type: Type.STRING, description: 'Target difficulty level' },
            overview: { type: Type.STRING, description: '1-2 sentence overview of what this quiz evaluates' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'Unique question id like q1, q2' },
                  question: { type: Type.STRING, description: 'The question text' },
                  type: { type: Type.STRING, description: 'multiple_choice or true_false' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Options array. 4 for multiple choice, 2 ["True", "False"] for true/false',
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: 'Index of the correct option in options array (0-indexed)',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'In-depth explanation of the solution and why that answer is correct',
                  },
                  keyConcept: {
                    type: Type.STRING,
                    description: 'The core educational principle, formula, or law tested',
                  },
                },
                required: ['id', 'question', 'type', 'options', 'correctAnswerIndex', 'explanation', 'keyConcept'],
              },
            },
          },
          required: ['title', 'topic', 'difficulty', 'overview', 'questions'],
        },
      },
    });

    const quizData = JSON.parse(response.text || '{}');
    res.json(quizData);
  } catch (err: unknown) {
    console.error('Error in /api/quiz/generate:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate practice quiz' });
  }
});


// ==========================================
// 4. Problem Step-by-Step Solver Endpoint
// ==========================================
app.post('/api/solve/step-by-step', async (req: Request, res: Response) => {
  try {
    if (!checkApiKey(res)) return;

    const { problem, subject = 'General' } = req.body;
    if (!problem) {
      res.status(400).json({ error: 'Problem statement is required' });
      return;
    }

    const prompt = `Solve and teach this problem step-by-step.
Subject: ${subject}
Problem:
${problem}

Please provide a structured response covering:
1. Understanding the problem & identifying what is given vs what to find.
2. The fundamental theorem, formula, or concept to use.
3. Step-by-step calculations/reasoning with clear justification for each move.
4. The verified final answer.
5. Common pitfalls and mistakes students make with this type of problem.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problemSummary: { type: Type.STRING },
            identifiedGiven: { type: Type.ARRAY, items: { type: Type.STRING } },
            goal: { type: Type.STRING },
            coreFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                  intermediateResult: { type: Type.STRING },
                },
                required: ['stepNumber', 'title', 'action', 'reasoning'],
              },
            },
            finalAnswer: { type: Type.STRING },
            verificationCheck: { type: Type.STRING },
            proTipAndMistakes: { type: Type.STRING },
          },
          required: ['problemSummary', 'goal', 'coreFormulas', 'steps', 'finalAnswer', 'proTipAndMistakes'],
        },
      },
    });

    const solutionData = JSON.parse(response.text || '{}');
    res.json(solutionData);
  } catch (err: unknown) {
    console.error('Error in /api/solve/step-by-step:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to solve problem' });
  }
});


// ==========================================
// Setup Vite middleware in dev or static in prod
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
