import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { slugifyHeading } from "@/lib/headings";

export async function Markdown({ source }: { source: string }) {
  const components = {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = flattenText(children);
      const id = slugifyHeading(text);
      return (
        <h2 id={id} {...props}>
          <a href={`#${id}`}>{children}</a>
        </h2>
      );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = flattenText(children);
      const id = slugifyHeading(text);
      return (
        <h3 id={id} {...props}>
          <a href={`#${id}`}>{children}</a>
        </h3>
      );
    },
    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = flattenText(children);
      const id = slugifyHeading(text);
      return (
        <h4 id={id} {...props}>
          <a href={`#${id}`}>{children}</a>
        </h4>
      );
    },
  };

  return (
    <div className="prose-shell">
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeHighlight],
          },
        }}
      />
    </div>
  );
}

function flattenText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(flattenText).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    return flattenText((children as { props?: { children?: React.ReactNode } }).props?.children ?? "");
  }

  return "";
}
