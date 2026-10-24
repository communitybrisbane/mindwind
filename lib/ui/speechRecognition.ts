/**
 * Web Speech API の最小限の型と、ブラウザからコンストラクタを取る関数。
 * TS の dom 型定義に無いので自前で定義する。記録（useSpeech）と相談（ConsultInput）の両方から使う。
 */

export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};
export type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
export type RecognitionCtor = new () => Recognition;

/** onresult のイベントを、確定した文（resultIndex 以降を順に）と、まだ確定していない途中の文字に分ける */
export function parseRecognitionResults(e: RecognitionEvent): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    if (r.isFinal) finals.push(r[0].transcript);
    else interim += r[0].transcript;
  }
  return { finals, interim };
}

/** 「話していない」「止めた」は致命的ではない。それ以外（許可拒否など）は致命的として終わりで知らせる */
export function isFatalRecognitionError(code: string | undefined): boolean {
  const c = code ?? "";
  return !(c === "no-speech" || c === "aborted");
}

export function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
