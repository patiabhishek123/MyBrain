import { getEncoding } from "js-tiktoken";

export interface TokenAwareChunk {
  content: string;
  tokenCount: number;
}

export interface ChunkTextOptions {
  chunkSizeTokens?: number;
  overlapTokens?: number;
}

const DEFAULT_CHUNK_SIZE_TOKENS = 800;
const DEFAULT_OVERLAP_TOKENS = 150;

const tokenizer = getEncoding("cl100k_base");

const countTokens = (text: string): number => tokenizer.encode(text).length;

const splitIntoSentences = (text: string): string[] => {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[.!?])\s+|\n{2,}/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

const splitLargeSentenceByWords = (sentence: string, chunkSizeTokens: number): string[] => {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const parts: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (countTokens(candidate) <= chunkSizeTokens) {
      current = candidate;
      continue;
    }

    if (current) {
      parts.push(current);
      current = word;
      continue;
    }

    // Extremely long single token/word fallback.
    parts.push(word);
    current = "";
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

const splitOversizedSentence = (sentence: string, chunkSizeTokens: number): string[] => {
  if (countTokens(sentence) <= chunkSizeTokens) {
    return [sentence];
  }

  const clauseParts = sentence.split(/(?<=[,;:])\s+/g).map((part) => part.trim()).filter(Boolean);
  if (clauseParts.length <= 1) {
    return splitLargeSentenceByWords(sentence, chunkSizeTokens);
  }

  const merged: string[] = [];
  let current = "";

  for (const clause of clauseParts) {
    const candidate = current ? `${current} ${clause}` : clause;
    if (countTokens(candidate) <= chunkSizeTokens) {
      current = candidate;
      continue;
    }

    if (current) {
      merged.push(current);
      current = "";
    }

    if (countTokens(clause) <= chunkSizeTokens) {
      current = clause;
    } else {
      merged.push(...splitLargeSentenceByWords(clause, chunkSizeTokens));
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
};

const pickOverlapSentences = (sentences: TokenAwareChunk[], overlapTokens: number): TokenAwareChunk[] => {
  if (overlapTokens <= 0 || sentences.length === 0) {
    return [];
  }

  const selected: TokenAwareChunk[] = [];
  let collectedTokens = 0;

  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    selected.unshift(sentences[i]);
    collectedTokens += sentences[i].tokenCount;
    if (collectedTokens >= overlapTokens) {
      break;
    }
  }

  return selected;
};

export const chunkTextByTokens = (text: string, options: ChunkTextOptions = {}): TokenAwareChunk[] => {
  const chunkSizeTokens = options.chunkSizeTokens ?? DEFAULT_CHUNK_SIZE_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  const baseSentences = splitIntoSentences(text);
  const sentenceUnits = baseSentences
    .flatMap((sentence) => splitOversizedSentence(sentence, chunkSizeTokens))
    .map((content) => ({ content, tokenCount: countTokens(content) }))
    .filter((unit) => unit.tokenCount > 0);

  if (sentenceUnits.length === 0) {
    return [];
  }

  const chunks: TokenAwareChunk[] = [];
  let current: TokenAwareChunk[] = [];
  let currentTokens = 0;

  for (const unit of sentenceUnits) {
    const nextTokens = currentTokens + unit.tokenCount;

    if (current.length > 0 && nextTokens > chunkSizeTokens) {
      chunks.push({
        content: current.map((item) => item.content).join(" ").trim(),
        tokenCount: currentTokens
      });

      current = pickOverlapSentences(current, overlapTokens);
      currentTokens = current.reduce((total, item) => total + item.tokenCount, 0);
    }

    current.push(unit);
    currentTokens += unit.tokenCount;
  }

  if (current.length > 0) {
    chunks.push({
      content: current.map((item) => item.content).join(" ").trim(),
      tokenCount: currentTokens
    });
  }

  return chunks.filter((chunk) => chunk.content.length > 0);
};
