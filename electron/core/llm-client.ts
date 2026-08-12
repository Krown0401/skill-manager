import OpenAI from 'openai';
import type { z } from 'zod';
import { getStorage } from './storage';

type CallOpts<T> = {
  systemPrompt: string;
  userPrompt: string;
  schema?: z.ZodSchema<T>;
  jsonMode?: boolean;
  temperature?: number;
  maxRetries?: number;
};

function buildClient(): OpenAI {
  const s = getStorage().getSettings();
  if (!s.llm.apiKey) throw new Error('请先在「设置 → LLM 配置」填写 API Key');
  return new OpenAI({
    apiKey: s.llm.apiKey,
    baseURL: s.llm.baseURL,
    dangerouslyAllowBrowser: false
  });
}

function extractJson(text: string): any {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[1] ?? match[0]) : JSON.parse(text);
}

export async function testLlmConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = buildClient();
    const settings = getStorage().getSettings();
    const r = await client.chat.completions.create({
      model: settings.llm.model,
      max_tokens: 16, temperature: 0,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }]
    });
    const t = r.choices[0]?.message.content ?? '';
    return { ok: t.includes('OK'), message: t || '(empty)' };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}

export async function callLlm<T = any>(opts: CallOpts<T>): Promise<T> {
  const { systemPrompt, userPrompt, schema, jsonMode = !!schema, temperature = 0.4, maxRetries = 2 } = opts;
  const client = buildClient();
  const settings = getStorage().getSettings();
  let lastErr: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const temp = attempt === 0 ? temperature : Math.max(0, temperature - 0.2);
      const res = await client.chat.completions.create({
        model: settings.llm.model,
        temperature: temp,
        response_format: jsonMode ? ({ type: 'json_object' } as any) : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      const content = res.choices[0]?.message.content ?? '';
      const parsed = jsonMode ? extractJson(content) : content;
      if (!schema) return parsed as T;
      const valid = schema.safeParse(parsed);
      if (!valid.success) throw new Error('Schema 校验失败: ' + valid.error.issues.map(i => i.message).join('; '));
      return valid.data;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('LLM 调用失败');
}
