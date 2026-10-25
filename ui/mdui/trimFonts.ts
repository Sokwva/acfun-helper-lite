interface PostCssNode {
  type: string;
  prop?: string;
  value?: string;
  remove(): void;
}

interface PostCssAtRule {
  nodes?: PostCssNode[];
  remove(): void;
}

interface PostCssRoot {
  walkAtRules(name: string, callback: (rule: PostCssAtRule) => void): void;
}

const keepWoff2 = (nodes: PostCssNode[]) => {
  const src = nodes.find((node) => node.type === 'decl' && node.prop === 'src');

  if (!src?.value) {
    return;
  }

  const woff2 = src.value.match(
    /url\([^)]*\.woff2\)\s*format\('woff2'\)/i,
  );

  if (woff2) {
    src.value = woff2[0];
  }
};

export const trimMduiFonts = {
  postcssPlugin: 'acfun-helper-trim-mdui-fonts',
  Once(root: PostCssRoot) {
    root.walkAtRules('font-face', (rule) => {
      const nodes = rule.nodes ?? [];
      const family =
        nodes.find(
          (node) => node.type === 'decl' && node.prop === 'font-family',
        )?.value ?? '';
      const weight =
        nodes.find(
          (node) => node.type === 'decl' && node.prop === 'font-weight',
        )?.value ?? '';
      const style =
        nodes.find(
          (node) => node.type === 'decl' && node.prop === 'font-style',
        )?.value ?? '';

      if (/Material Icons/i.test(family)) {
        keepWoff2(nodes);
        return;
      }

      if (!/Roboto/i.test(family)) {
        return;
      }

      const isNeededWeight =
        weight === '400' || weight === '500' || weight === '700';

      if (!isNeededWeight || style !== 'normal') {
        rule.remove();
        return;
      }

      keepWoff2(nodes);
    });
  },
};
