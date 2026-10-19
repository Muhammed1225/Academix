const allowedTags = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'CODE', 'PRE', 'BLOCKQUOTE', 'H2', 'H3', 'UL', 'OL', 'LI']);

export function sanitizeRichText(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const clean = document.createElement('div');

  const copySafeNodes = (source: ParentNode, target: Node) => {
    source.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        target.appendChild(document.createTextNode(node.textContent ?? ''));
      } else if (node instanceof HTMLElement) {
        if (!allowedTags.has(node.tagName)) {
          copySafeNodes(node, target);
          return;
        }
        const safeNode = document.createElement(node.tagName.toLowerCase());
        copySafeNodes(node, safeNode);
        target.appendChild(safeNode);
      }
    });
  };

  copySafeNodes(parsed.body, clean);
  return clean.innerHTML;
}

export default function RichText({ text, className }: { text: string; className?: string }) {
  const containsMarkup = /<\/?(?:p|div|br|strong|b|em|i|code|pre|blockquote|h2|h3|ul|ol|li)\b/i.test(text);

  if (!containsMarkup) return <p className={className}>{text}</p>;

  return <div className={`rich-text ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(text) }} />;
}
