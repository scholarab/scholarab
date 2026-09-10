import { useEffect, useState } from 'react';
import EligibilityQuiz from './EligibilityQuiz';
import type { quizPayload } from '../lib/quiz-payload';
type Payload = ReturnType<typeof quizPayload>;
const cache = new Map<string, Promise<Payload>>();
function load(url: string) {
  const cached =
    cache.get(url) ??
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load the matching data');
        const data = (await res.json()) as Payload;
        if (
          data.version !== 1 ||
          !Array.isArray(data.scholarships) ||
          !Array.isArray(data.programs)
        )
          throw new Error('Please reload to get the latest quiz');
        return data;
      })
      .catch((e) => {
        cache.delete(url);
        throw e;
      });
  cache.set(url, cached);
  return cached;
}
export default function QuizLoader({ url }: { url: string }) {
  const [data, setData] = useState<Payload>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    void load(url)
      .then((data) => {
        if (alive) {
          setData(data);
          setError('');
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [url, attempt]);
  if (data) return <EligibilityQuiz scholarships={data.scholarships} programs={data.programs} />;
  return (
    <div role="status">
      {error ? (
        <>
          <p>{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </>
      ) : (
        'Loading the scholarship quiz…'
      )}
    </div>
  );
}
