import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Highlighted, type Lang } from "@/components/ui/highlight";

const CF: Record<string, Set<string>> = {
  python: new Set("if elif else for while try except finally return raise break continue with pass assert await yield import from match case".split(" ")),
  js: new Set("if else for while do return import export from try catch finally throw switch case break continue default await".split(" ")),
  bash: new Set("if then else elif fi for while do done case esac".split(" ")),
};

/** Existing tokenizer, but control-flow keywords get the Dark+ purple (class "cf"). */
export function VscHighlighted({ code, lang }: { code: string; lang: Lang }): ReactNode {
  const cf = CF[lang];
  const out = Highlighted({ code, lang });
  if (!cf) return out;
  const walk = (n: ReactNode): ReactNode =>
    Children.map(n, (c) => {
      if (!isValidElement(c)) return c;
      const el = c as ReactElement<{ className?: string; children?: ReactNode }>;
      if (el.props.className === "tok-k" && typeof el.props.children === "string" && cf.has(el.props.children)) {
        return cloneElement(el, { className: "tok-k cf" });
      }
      if (el.props.children !== undefined && typeof el.props.children !== "string") return cloneElement(el, undefined, walk(el.props.children));
      return c;
    });
  return walk(out);
}
