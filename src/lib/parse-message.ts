/** The only Claude operation ScholarAB uses. Keep the same model and prompt. */
export async function parseMessage(apiKey: string, prompt: string): Promise<string> {
  const body = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }] });
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body,
      });
      if (response.ok) {
        const message = await response.json();
        const first = message.content?.[0];
        return first?.type === 'text' && typeof first.text === 'string' ? first.text.trim() : '';
      }
      await response.body?.cancel();
    } catch {
      // Retry transport failures; never log request headers or response bodies.
    }
    const retryable = !response || [408, 409, 429].includes(response.status) || response.status >= 500;
    if (!retryable || attempt === 3) throw new Error('Eligibility service unavailable');
    await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
  }
  throw new Error('Eligibility service unavailable');
}
