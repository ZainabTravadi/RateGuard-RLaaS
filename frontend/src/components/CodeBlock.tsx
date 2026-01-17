import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  code: string;
  language?: string;
  copied?: boolean;
  onCopy?: () => void;
  className?: string;
}

export function CodeBlock({
  code,
  language = "javascript",
  copied = false,
  onCopy,
  className,
}: CodeBlockProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-lg border border-border/60 bg-[#0b0f16] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      {onCopy && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-foreground h-8"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-2 text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-2" />
              Copy
            </>
          )}
        </Button>
      )}

      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: "16px 18px",
          background: "transparent",
          fontSize: "0.92rem",
          lineHeight: 1.55,
          borderRadius: "inherit",
        }}
        codeTagProps={{
          style: {
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            letterSpacing: "-0.01em",
          },
        }}
      >
        {code.trimEnd()}
      </SyntaxHighlighter>
    </div>
  );
}
