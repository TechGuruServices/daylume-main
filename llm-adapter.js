// src/utils/llm-adapter.js
import OpenAI from 'openai';

class LLMAdapter {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'groq';
    this.client = this.initializeClient();
    this.model = this.getModel();
  }

  initializeClient() {
    const configs = {
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://localhost',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'CraigsCatch',
        },
      },
      together: {
        apiKey: process.env.TOGETHER_API_KEY,
        baseURL: 'https://api.together.xyz/v1',
      },
    };

    const config = configs[this.provider];
    if (!config) throw new Error(`Unknown LLM provider: ${this.provider}`);
    
    return new OpenAI(config);
  }

  getModel() {
    const models = {
      groq: 'llama-3.1-70b-versatile',
      openrouter: 'meta-llama/llama-3.1-70b-instruct',
      together: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    };
    return process.env.OLLAMA_MODEL || models[this.provider];
  }

  async chat(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 512,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error(`LLM error (${this.provider}):`, error.message);
      throw error;
    }
  }

  // For your Craigslist item analysis
  async analyzeItem(item) {
    const prompt = `
      Analyze this Craigslist free item listing:
      Title: ${item.title}
      Description: ${item.description}
      Location: ${item.location}
      
      Provide:
      1. Is this item valuable/usable? (Yes/No/Maybe)
      2. What condition does it appear to be in?
      3. Any red flags or concerns?
      4. Would you pick this up? Why/why not?
      
      Keep response concise (2-3 sentences).
    `;

    return await this.chat([{ role: 'user', content: prompt }]);
  }
}

export default new LLMAdapter();