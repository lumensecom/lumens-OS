import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Render de markdown con estilos LUMENS (sin plugin de typography). */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="max-w-none text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="font-display mb-4 mt-2 text-2xl font-extrabold tracking-tight" {...props} />
          ),
          h2: (props) => (
            <h2 className="font-display mb-3 mt-6 text-xl font-bold tracking-tight" {...props} />
          ),
          h3: (props) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold" {...props} />
          ),
          p: (props) => <p className="mb-3" {...props} />,
          ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-6" {...props} />,
          ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-6" {...props} />,
          li: (props) => <li className="marker:text-muted-foreground" {...props} />,
          a: (props) => (
            <a className="font-medium underline underline-offset-4" target="_blank" rel="noreferrer" {...props} />
          ),
          blockquote: (props) => (
            <blockquote className="mb-3 border-l-2 border-primary pl-4 italic text-muted-foreground" {...props} />
          ),
          code: (props) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]" {...props} />
          ),
          pre: (props) => (
            <pre className="mb-3 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-[13px]" {...props} />
          ),
          table: (props) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border-b bg-muted/50 px-3 py-2 text-left font-medium" {...props} />
          ),
          td: (props) => <td className="border-b px-3 py-2" {...props} />,
          hr: () => <hr className="my-6 border-border" />,
          strong: (props) => <strong className="font-semibold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
