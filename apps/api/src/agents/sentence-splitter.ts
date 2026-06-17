export type SentenceSplitterOptions = {
  maxSentences?: number;
  maxTotalChars?: number;
  softLimit?: number;
};

const DEFAULT_OPTIONS: Required<SentenceSplitterOptions> = {
  maxSentences: 5,
  maxTotalChars: 400,
  softLimit: 80,
};

const SENTENCE_PUNCT = /[。！？!?…]/u;
const SOFT_PAUSE = /[，,；;]/u;
const PAIRS: Record<string, string> = {
  "“": "”",
  "‘": "’",
  "（": "）",
  "(": ")",
  "「": "」",
  "『": "』",
  "<": ">",
};
const OPENERS = new Set(Object.keys(PAIRS));
const CLOSERS = new Set(Object.values(PAIRS));

export class SentenceSplitter {
  private buffer = "";
  private sentences = 0;
  private totalChars = 0;
  private depth = 0;
  private finished = false;
  private readonly opts: Required<SentenceSplitterOptions>;

  constructor(options: SentenceSplitterOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  get done(): boolean {
    return this.finished;
  }

  push(chunk: string): string[] {
    if (this.finished) return [];
    const out: string[] = [];

    for (const ch of chunk) {
      if (this.finished) break;

      // 显式 [msg] 标签：作为强制切句信号，去掉标签
      this.buffer += ch;

      if (this.buffer.endsWith("[msg]") || this.buffer.endsWith("[/msg]")) {
        const tagLen = this.buffer.endsWith("[/msg]") ? 6 : 5;
        this.buffer = this.buffer.slice(0, -tagLen);
        this.flushIfPossible(out);
        continue;
      }

      if (OPENERS.has(ch)) {
        this.depth += 1;
        continue;
      }
      if (CLOSERS.has(ch)) {
        this.depth = Math.max(0, this.depth - 1);
        continue;
      }

      if (ch === "\n") {
        this.flushIfPossible(out);
        continue;
      }

      if (this.depth === 0 && SENTENCE_PUNCT.test(ch)) {
        this.flushIfPossible(out);
        continue;
      }

      // buffer 过长兜底：在最近的逗号/分号处断开
      if (this.depth === 0 && this.buffer.length >= this.opts.softLimit) {
        const fallback = this.findSoftBreak();
        if (fallback > 0) {
          const piece = this.buffer.slice(0, fallback + 1);
          this.buffer = this.buffer.slice(fallback + 1);
          this.commit(piece, out);
        }
      }
    }

    return out;
  }

  flush(): string[] {
    if (this.finished) return [];
    const out: string[] = [];
    this.flushIfPossible(out, true);
    this.finished = true;
    return out;
  }

  private flushIfPossible(out: string[], force = false): void {
    const piece = this.buffer.trim();
    this.buffer = "";
    if (!piece) return;
    if (!force && piece.length === 0) return;
    this.commit(piece, out);
  }

  private commit(piece: string, out: string[]): void {
    const trimmed = piece.trim();
    if (!trimmed) return;
    if (this.sentences >= this.opts.maxSentences) {
      this.finished = true;
      return;
    }
    const remainingTotal = this.opts.maxTotalChars - this.totalChars;
    if (remainingTotal <= 0) {
      this.finished = true;
      return;
    }
    const final = trimmed.length > remainingTotal ? trimmed.slice(0, remainingTotal) : trimmed;
    this.sentences += 1;
    this.totalChars += final.length;
    out.push(final);
    if (this.sentences >= this.opts.maxSentences || this.totalChars >= this.opts.maxTotalChars) {
      this.finished = true;
    }
  }

  private findSoftBreak(): number {
    for (let i = this.buffer.length - 1; i >= Math.floor(this.opts.softLimit / 2); i -= 1) {
      if (SOFT_PAUSE.test(this.buffer[i])) return i;
    }
    return -1;
  }
}
