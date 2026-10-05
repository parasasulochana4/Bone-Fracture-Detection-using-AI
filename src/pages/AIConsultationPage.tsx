import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Bot, User, Loader2, AlertCircle,
  Stethoscope, Sparkles,
} from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Callout from '@/components/Callout';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const suggestedQuestions = [
  'What does a fracture prediction mean?',
  'I have pain but no fracture was detected. What should I do?',
  'How long does a typical fracture take to heal?',
  'What are the warning signs after a fracture?',
  'Can you explain the Grad-CAM heatmap?',
  'When should I see a real doctor?',
];

// Knowledge base for rule-based responses (no external API needed)
const knowledgeBase: { keywords: string[]; response: string }[] = [
  {
    keywords: ['fracture', 'prediction', 'detected', 'positive', 'result'],
    response: 'A fracture prediction from the AI model means the neural network detected patterns in your X-ray that are associated with bone fractures. However, this is NOT a medical diagnosis. The model has an accuracy of around 85-93% depending on the architecture used, which means false positives and false negatives are possible. You should always confirm the result with a qualified orthopedic specialist or radiologist who can review the actual X-ray in a clinical setting.',
  },
  {
    keywords: ['pain', 'no fracture', 'negative', 'but', 'still', 'symptom'],
    response: 'Even if the AI model did not detect a fracture, your symptoms are real and should be taken seriously. Pain without a visible fracture on X-ray can indicate: (1) A hairline or stress fracture too small to detect, (2) A soft tissue injury like a sprain or ligament tear, (3) Bone bruising, (4) Tendonitis or muscle strain. I strongly recommend seeing a healthcare professional if your pain persists for more than 7-10 days, worsens over time, or is accompanied by swelling, bruising, or difficulty moving the affected area.',
  },
  {
    keywords: ['heal', 'healing', 'recovery', 'how long', 'weeks', 'months'],
    response: 'Fracture healing times vary significantly depending on the type and location of the fracture:\n\n- Simple fractures: typically 6-8 weeks in a cast\n- Hairline/stress fractures: 4-6 weeks with rest\n- Complex fractures requiring surgery: 8-12 weeks or longer\n- Weight-bearing bones (femur, tibia): 12+ weeks\n- Small bones (wrist, fingers): 4-6 weeks\n\nFactors that affect healing include age, nutrition, smoking, diabetes, and the severity of the injury. Your orthopedic specialist will monitor healing with follow-up X-rays and provide a personalized timeline.',
  },
  {
    keywords: ['warning', 'sign', 'emergency', 'worsening', 'concerning', 'danger'],
    response: 'Seek immediate medical attention if you experience any of the following after a fracture:\n\n- Severe or worsening pain not responding to medication\n- Numbness, tingling, or loss of sensation below the injury\n- Skin turning pale or blue below the fracture site\n- Fever or chills (possible infection)\n- Visible deformity or limb shortening\n- Inability to move fingers or toes\n- Increasing swelling that makes the cast or splint too tight\n\nThese could indicate complications like compartment syndrome, nerve damage, or infection, which require urgent treatment.',
  },
  {
    keywords: ['grad-cam', 'gradcam', 'heatmap', 'explain', 'explainability', 'activation'],
    response: 'Grad-CAM (Gradient-weighted Class Activation Mapping) is an explainability technique that shows which regions of your X-ray most influenced the model\'s prediction. The heatmap overlays warm colors (red, orange, yellow) on the areas the model focused on when making its decision. If the model predicts a fracture, the red regions typically highlight where it detected fracture-like patterns. This helps you understand whether the model is looking at clinically relevant areas or making decisions based on irrelevant image artifacts. However, Grad-CAM is a visualization aid, not a diagnostic tool.',
  },
  {
    keywords: ['doctor', 'specialist', 'see', 'consult', 'when', 'real', 'professional'],
    response: 'You should consult a real doctor in these situations:\n\n1. ALWAYS: The AI prediction is not a medical diagnosis. Confirm with a professional.\n2. If you have pain, swelling, or difficulty using the limb regardless of the AI result\n3. If symptoms persist beyond 7-10 days\n4. If symptoms worsen at any point\n5. If you have a fracture prediction — see an orthopedic specialist\n6. If you have ongoing bone health concerns — see your primary care physician\n\nAn orthopedic specialist (bone doctor) or a radiologist (imaging specialist) are the most relevant specialists for fracture diagnosis and treatment.',
  },
  {
    keywords: ['accuracy', 'model', 'reliable', 'trust', 'performance'],
    response: 'The models in this system have the following approximate performance on the test dataset:\n\n- Custom CNN: ~89% accuracy\n- Vision Transformer (ViT): ~85% accuracy\n- Swin Transformer: ~86% accuracy\n- ResNet-50 (Transfer Learning): ~92-93% accuracy\n\nThese are honest evaluation metrics on an unseen test set. While these numbers are good, they mean that 7-15 out of 100 predictions could be incorrect. This is why AI predictions should always be verified by a medical professional. The model is a screening aid, not a replacement for clinical diagnosis.',
  },
  {
    keywords: ['treatment', 'cast', 'surgery', 'physical therapy', 'rehab'],
    response: 'Fracture treatment depends on the type, location, and severity of the break:\n\n- Stable/simple fractures: Casting or splinting for 6-8 weeks\n- Displaced fractures: May require reduction (re-alignment) before casting\n- Complex fractures: Surgical intervention with plates, screws, or rods\n- After healing: Physical therapy to restore strength and mobility\n\nYour orthopedic specialist will determine the best treatment plan based on clinical X-rays, your overall health, and activity needs. Never attempt to self-treat a suspected fracture.',
  },
  {
    keywords: ['bone', 'health', 'calcium', 'vitamin', 'prevent', 'diet'],
    response: 'Maintaining good bone health can help prevent fractures:\n\n- Calcium: 1,000-1,200 mg/day (dairy, leafy greens, fortified foods)\n- Vitamin D: 600-800 IU/day (sunlight, fatty fish, supplements)\n- Weight-bearing exercise: Walking, jogging, resistance training 3-4x/week\n- Avoid smoking and excessive alcohol\n- Balance training to prevent falls, especially in older adults\n- Consider a bone density scan if you have risk factors for osteoporosis\n\nThese are general guidelines — consult your doctor for personalized advice.',
  },
];

function generateResponse(userMessage: string, predictionContext?: string): string {
  const lower = userMessage.toLowerCase();

  // Check if prediction context is relevant
  const hasFractureContext = predictionContext && predictionContext.toLowerCase().includes('fracture');

  for (const entry of knowledgeBase) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      let response = entry.response;
      if (hasFractureContext && entry.keywords.includes('fracture')) {
        response = `Based on your prediction result (${predictionContext}), here's what you should know:\n\n${response}`;
      }
      return response;
    }
  }

  // Default response
  let defaultResponse = "I'm here to help with questions about your X-ray prediction, fracture detection, treatment guidance, and bone health. I can explain the AI model's prediction, discuss what the results mean, and guide you on when to see a real doctor. Could you ask about your specific concern — for example, about your prediction result, healing times, warning signs, or bone health?";

  if (hasFractureContext) {
    defaultResponse = `I see you have a prediction result (${predictionContext}). I can help you understand what this means, what steps to take next, and when to consult a healthcare professional. Try asking me about:\n\n- What your prediction means\n- Recommended next steps\n- Warning signs to watch for\n- How to maintain bone health`;
  }

  return defaultResponse;
}

export default function AIConsultationPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Doctor assistant. I can help answer questions about your X-ray prediction, fracture detection, treatment guidance, and bone health. I can also discuss your prediction results if you've made one. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictionContext, setPredictionContext] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load prediction context from sessionStorage (set by DemoPage)
  useEffect(() => {
    const stored = sessionStorage.getItem('predictionContext');
    if (stored) {
      setPredictionContext(stored);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I see you have a recent prediction: ${stored}. I can help you understand this result and discuss next steps. Feel free to ask me any questions about it.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = generateResponse(userMsg.content, predictionContext);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    }, 800 + Math.random() * 600);
  }, [input, loading, predictionContext]);

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="AI Consultation"
        title="AI Doctor Consultation"
        description="Chat with the AI assistant about your X-ray prediction, symptoms, or bone health questions. The assistant can reference your recent prediction if available."
      />

      <Callout variant="warning" title="Medical Disclaimer">
        This AI assistant provides general health information for educational purposes only.
        It does not provide medical diagnosis, treatment, or professional advice. Always consult
        a qualified healthcare professional for medical decisions.
      </Callout>

      {/* Prediction context badge */}
      {predictionContext && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5">
          <Stethoscope className="h-4 w-4 text-sky-400" />
          <span className="text-sm text-sky-300">
            Current context: <strong>{predictionContext}</strong>
          </span>
          <button
            onClick={() => {
              setPredictionContext('');
              sessionStorage.removeItem('predictionContext');
            }}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Chat interface */}
      <div className="mt-6 flex h-[600px] flex-col rounded-2xl border border-slate-800 bg-slate-900/40">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  msg.role === 'assistant'
                    ? 'bg-gradient-to-br from-sky-500 to-cyan-600'
                    : 'bg-slate-700'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot className="h-5 w-5 text-white" />
                    : <User className="h-5 w-5 text-white" />
                  }
                </div>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === 'assistant'
                    ? 'bg-slate-800/60 text-slate-200'
                    : 'bg-sky-500/15 text-slate-100'
                }`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="rounded-xl bg-slate-800/60 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested questions */}
        {messages.length <= 2 && !loading && (
          <div className="border-t border-slate-800 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestedQuestion(q)}
                  className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-sky-500/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-xs text-slate-400">
          The AI assistant uses a knowledge base of medical information related to bone fractures,
          treatment, and bone health. It can reference your recent prediction result if you've made
          one on the Prediction page. Responses are generated locally and do not expose any API keys.
          For complex medical questions, always consult a real healthcare professional.
        </p>
      </div>
    </div>
  );
}
