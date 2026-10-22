"use client";
import type { Block } from "@/content/types";
import { WidgetBlock } from "@/components/widgets";
import { useT } from "@/i18n/context";
import { AnswerBlock } from "./answer-block";
import { BlockKeyContext } from "./block-context";
import { Callout } from "./callout";
import { CodeView } from "./code-block";
import { ExternalBlock } from "./external-block";
import { FlashcardsBlock } from "./flashcards-block";
import { MatchBlock } from "./match-block";
import { Md } from "./md";
import { OrderBlock } from "./order-block";
import { PythonBlock } from "./python-block";
import { QuizBlock } from "./quiz-block";
import { SortBlock } from "./sort-block";
import { SqlBlock } from "./sql-block";
import { TerminalBlock } from "./terminal-block";

/** Widgets that have a win condition (they call solve()). */
export const GOAL_WIDGETS = new Set(["packet-capture", "log-analyzer", "phishing", "cia-triad", "chmod", "sqli-lab", "xss-lab"]);

/** Does this block count toward "all tasks solved" on the lesson page? */
export function isInteractive(b: Block): boolean {
  switch (b.kind) {
    case "quiz": case "python": case "terminal": case "sql": case "match": case "order": case "sort": case "answer": case "external":
      return true;
    case "widget":
      return GOAL_WIDGETS.has(b.widget) || (b.widget === "caesar" && !!b.props?.ciphertext);
    default:
      return false;
  }
}

export function BlockRenderer({ block, index, slug }: { block: Block; index: number; slug: string }) {
  const t = useT();
  let node: React.ReactNode;
  switch (block.kind) {
    case "md": node = <Md md={block.md} blockIndex={index} />; break;
    case "callout": node = <Callout tone={block.tone} title={block.title} md={block.md} blockIndex={index} />; break;
    case "code": node = <CodeView code={block.code} lang={block.lang} caption={block.caption} />; break;
    case "quiz": node = <QuizBlock block={block} index={index} />; break;
    case "python": node = <PythonBlock block={block} />; break;
    case "terminal": node = <TerminalBlock block={block} />; break;
    case "sql": node = <SqlBlock block={block} />; break;
    case "flashcards": node = <FlashcardsBlock block={block} index={index} />; break;
    case "match": node = <MatchBlock block={block} />; break;
    case "order": node = <OrderBlock block={block} />; break;
    case "sort": node = <SortBlock block={block} />; break;
    case "answer": node = <AnswerBlock block={block} index={index} />; break;
    case "external": node = <ExternalBlock block={block} index={index} />; break;
    case "widget": node = <WidgetBlock widget={block.widget} props={block.props} />; break;
    default: node = <p className="text-bad">{t.blocks.unknown}</p>;
  }
  return <BlockKeyContext.Provider value={`${slug}#${index}`}>{node}</BlockKeyContext.Provider>;
}
