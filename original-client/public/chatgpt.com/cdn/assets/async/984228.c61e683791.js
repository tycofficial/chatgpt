export const __rspack_esm_ids=[984228];export const __webpack_modules__={MAWH(n,e,t){let r=String.raw`(() => {
  const root = document.querySelector("main");
  if (!(root instanceof HTMLElement)) {
    return;
  }

  let hasFinalized = false;
  let previousHtml = null;

  function getRenderableHtml(html, isFinal) {
    if (isFinal) {
      return html;
    }

    let renderableHtml = html;
    const trailingTagStart = renderableHtml.lastIndexOf("<");
    if (trailingTagStart >= 0) {
      const trailingTag = renderableHtml.slice(trailingTagStart).toLowerCase();
      if ("</appblock>".startsWith(trailingTag)) {
        renderableHtml = renderableHtml.slice(0, trailingTagStart);
      }
    }

    const lowercaseHtml = renderableHtml.toLowerCase();
    const lastStyleStart = lowercaseHtml.lastIndexOf("<style");
    const lastStyleEnd = lowercaseHtml.lastIndexOf("</style");
    if (lastStyleStart > lastStyleEnd) {
      return renderableHtml.slice(0, lastStyleStart);
    }

    return renderableHtml;
  }

  function removePartialExecutionAttributes(fragment) {
    for (const element of fragment.querySelectorAll("*")) {
      for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase();
        if (attributeName.startsWith("on") || attributeName === "srcdoc") {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (
          /^(?:href|src|action|formaction|xlink:href)$/i.test(attribute.name) &&
          /^\s*javascript:/i.test(attribute.value)
        ) {
          element.removeAttribute(attribute.name);
        }
      }

      if (element.matches("button, input, select, textarea, fieldset")) {
        element.setAttribute("disabled", "");
      }
      if (element.matches("a[href]")) {
        element.removeAttribute("href");
        element.setAttribute("aria-disabled", "true");
      }
      if (element.hasAttribute("contenteditable")) {
        element.setAttribute("contenteditable", "false");
      }
    }
  }

  function markNewElement(node) {
    if (!(node instanceof Element) || node.tagName === "STYLE") {
      return;
    }

    node.setAttribute("data-app-block-stream-enter", "");
    node.addEventListener(
      "animationend",
      () => node.removeAttribute("data-app-block-stream-enter"),
      { once: true }
    );
  }

  function synchronizeAttributes(currentElement, nextElement) {
    for (const attribute of Array.from(currentElement.attributes)) {
      if (
        attribute.name !== "data-app-block-stream-enter" &&
        !nextElement.hasAttribute(attribute.name)
      ) {
        currentElement.removeAttribute(attribute.name);
      }
    }

    for (const attribute of Array.from(nextElement.attributes)) {
      if (currentElement.getAttribute(attribute.name) !== attribute.value) {
        currentElement.setAttribute(attribute.name, attribute.value);
      }
    }
  }

  function synchronizeChildren(currentParent, nextParent, isFinal) {
    let currentChild = currentParent.firstChild;

    for (const nextChild of Array.from(nextParent.childNodes)) {
      if (currentChild === null) {
        const insertedChild = nextChild.cloneNode(true);
        currentParent.appendChild(insertedChild);
        markNewElement(insertedChild);
        continue;
      }

      const isMatchingNode =
        currentChild.nodeType === nextChild.nodeType &&
        currentChild.nodeName === nextChild.nodeName;
      if (!isMatchingNode) {
        const insertedChild = nextChild.cloneNode(true);
        currentParent.replaceChild(insertedChild, currentChild);
        markNewElement(insertedChild);
        currentChild = insertedChild.nextSibling;
        continue;
      }

      if (currentChild instanceof Element && nextChild instanceof Element) {
        synchronizeAttributes(currentChild, nextChild);
        synchronizeChildren(currentChild, nextChild, isFinal);
      } else if (currentChild.nodeValue !== nextChild.nodeValue) {
        currentChild.nodeValue = nextChild.nodeValue;
      }

      currentChild = currentChild.nextSibling;
    }

    if (!isFinal) {
      return;
    }

    while (currentChild !== null) {
      const nextCurrentChild = currentChild.nextSibling;
      currentChild.remove();
      currentChild = nextCurrentChild;
    }
  }

  function applyStreamUpdate(update) {
    if (
      hasFinalized ||
      update === null ||
      typeof update !== "object" ||
      typeof update.html !== "string"
    ) {
      return;
    }

    const isFinal = update.isFinal === true;
    if (!isFinal && previousHtml === update.html) {
      return;
    }
    previousHtml = update.html;

    const template = document.createElement("template");
    template.innerHTML = getRenderableHtml(update.html, isFinal);
    const scripts = Array.from(template.content.querySelectorAll("script"));
    for (const script of scripts) {
      script.remove();
    }

    if (!isFinal) {
      removePartialExecutionAttributes(template.content);
    }

    synchronizeChildren(root, template.content, isFinal);

    if (!isFinal) {
      return;
    }

    hasFinalized = true;
    for (const sourceScript of scripts) {
      const executableScript = document.createElement("script");
      for (const attribute of Array.from(sourceScript.attributes)) {
        executableScript.setAttribute(attribute.name, attribute.value);
      }
      executableScript.textContent = sourceScript.textContent;
      root.appendChild(executableScript);
    }
  }

  window.addEventListener("openai:set_globals", (event) => {
    const globals = event.detail && event.detail.globals;
    if (globals && Object.hasOwn(globals, "__appBlockStream")) {
      applyStreamUpdate(globals.__appBlockStream);
    }
  });

  if (window.openai && window.openai.__appBlockStream) {
    applyStreamUpdate(window.openai.__appBlockStream);
  }
})();
`;t.d(e,{},{a:r})},joof(n,e,t){t.d(e,{getStandaloneVisualizationHtml:()=>c});var r=t("vaO0"),o=t("QZdn"),a=t("o6lh");let i=r.b.resourceDomains.join(" "),s=`default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${i}; style-src 'unsafe-inline' ${i}; img-src ${i}; font-src ${i}; media-src ${i}; worker-src blob:; connect-src blob: data:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`,l=s.replace("frame-src 'none'","frame-src 'self'");function c(n,e){let{locale:t,styles:r=':root {\n  color-scheme: light dark;\n  background-color: var(\n    --background,\n    var(--color-background-primary, light-dark(rgb(255 255 255), rgb(24 24 24)))\n  ) !important;\n\n  /* Agent-facing contract; keep in sync with SKILL.md. */\n  --background: var(\n    --color-background-primary,\n    light-dark(rgb(255 255 255), rgb(24 24 24))\n  );\n  --foreground: var(\n    --color-text-primary,\n    light-dark(rgb(26 28 31), rgb(255 255 255))\n  );\n  --card: color-mix(in oklab, var(--foreground) 5%, var(--background));\n  --card-foreground: var(\n    --color-text-primary,\n    light-dark(rgb(26 28 31), rgb(255 255 255))\n  );\n  --popover: var(\n    --color-background-secondary,\n    light-dark(rgb(255 255 255), rgb(45 45 45))\n  );\n  --popover-foreground: var(\n    --color-text-primary,\n    light-dark(rgb(26 28 31), rgb(255 255 255))\n  );\n  --primary: var(\n    --color-text-info,\n    light-dark(rgb(51 156 255), rgb(131 195 255))\n  );\n  --primary-foreground: var(\n    --color-text-inverse,\n    light-dark(rgb(255 255 255), rgb(13 13 13))\n  );\n  --secondary: var(\n    --color-background-secondary,\n    light-dark(rgb(255 255 255 / 96%), rgb(54 54 54 / 96%))\n  );\n  --secondary-foreground: var(\n    --color-text-primary,\n    light-dark(rgb(26 28 31), rgb(255 255 255))\n  );\n  --muted: color-mix(in srgb, var(--foreground) 10%, transparent);\n  --muted-foreground: var(\n    --color-text-secondary,\n    light-dark(rgb(26 28 31 / 49.4%), rgb(255 255 255 / 49.8%))\n  );\n  --accent: var(\n    --color-background-info,\n    light-dark(rgb(229 242 255), rgb(13 39 63))\n  );\n  --accent-foreground: var(\n    --color-text-info,\n    light-dark(rgb(51 156 255), rgb(131 195 255))\n  );\n  --destructive: var(\n    --color-text-warning,\n    light-dark(rgb(226 85 7), rgb(255 133 73))\n  );\n  --border: var(\n    --color-border-secondary,\n    light-dark(rgb(26 28 31 / 8%), rgb(255 255 255 / 8.2%))\n  );\n  --input: var(\n    --color-border-primary,\n    light-dark(\n      rgb(26 28 31 / 11.8%),\n      color-mix(in oklab, rgb(0 0 0) 10%, transparent)\n    )\n  );\n  --ring: var(\n    --color-ring-primary,\n    light-dark(rgb(51 156 255), rgb(131 195 255 / 76%))\n  );\n  --font-size-base: var(--font-text-md-size, 16px);\n  --blue: light-dark(rgb(51 156 255), rgb(51 156 255));\n  --orange: light-dark(rgb(226 85 7), rgb(251 106 34));\n  --green: light-dark(rgb(0 162 64), rgb(64 201 119));\n  --red: light-dark(rgb(224 46 42), rgb(255 103 100));\n  --purple: light-dark(rgb(146 79 247), rgb(173 123 249));\n  --yellow: light-dark(rgb(255 195 0), rgb(255 210 64));\n  --viz-series-1: light-dark(rgb(51 156 255), rgb(131 195 255));\n  --viz-series-2: light-dark(rgb(243 136 59), rgb(245 154 86));\n  --viz-series-3: light-dark(rgb(93 201 119), rgb(116 213 139));\n  --viz-series-4: light-dark(rgb(235 119 177), rgb(240 143 192));\n  --viz-series-5: light-dark(rgb(155 121 236), rgb(170 145 239));\n  --viz-series-6: light-dark(rgb(58 185 177), rgb(90 203 194));\n\n  /* Internal implementation variables; not part of the agent contract. */\n  --font-sans:\n    -apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI",\n    Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji",\n    "Segoe UI Symbol";\n  --font-mono:\n    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono",\n    monospace;\n  --font-size-normal: max(11px, var(--font-size-base));\n  --font-size-tooltip: calc(var(--font-size-base) - 1px);\n  --font-size-small: max(11px, calc(var(--font-size-base) - 2px));\n  --font-size-h1: calc(var(--font-size-normal) * 1.7142857143);\n  --font-size-h2: calc(var(--font-size-normal) * 1.4285714286);\n  --font-size-h3: calc(var(--font-size-normal) * 1.2857142857);\n  --font-weight-normal: 400;\n  --font-weight-medium: 500;\n  --icon-size: 16px;\n  --line-height-normal: calc(var(--font-size-normal) * 1.5);\n  --line-height-tooltip: calc(var(--font-size-tooltip) * 1.4285714286);\n  --line-height-small: calc(var(--font-size-small) + 4px);\n  --corner-shape: round;\n  --radius: var(--border-radius-lg, 8px);\n  --radius-sm: calc(var(--radius) * 0.5);\n  --radius-md: calc(var(--radius) * 0.75);\n  --radius-lg: var(--radius);\n  --radius-2xl: calc(var(--radius) * 2);\n  --radius-full: 9999px;\n  --shadow-sm: 0 1px 2px -1px rgb(0 0 0 / 8%);\n  --checkmark-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 17 17\'%3E%3Cpath d=\'M12.8961 3.64101C13.1297 3.41418 13.4984 3.37523 13.7779 3.56581C14.0571 3.75635 14.1554 4.11331 14.0299 4.41347L13.9615 4.53847L7.71151 13.7045C7.59411 13.8767 7.4063 13.9877 7.19881 14.0072C6.99136 14.0267 6.78564 13.9533 6.63826 13.806L2.88826 10.056L2.79842 9.9457C2.6192 9.67407 2.64927 9.30496 2.88826 9.06581C3.12738 8.82669 3.49647 8.79676 3.76815 8.97597L3.8785 9.06581L7.03084 12.2182L12.8053 3.74941L12.8961 3.64101Z\'/%3E%3C/svg%3E");\n\n  /* Legacy aliases; not part of the current agent contract. */\n  --viz-bg: transparent;\n  --viz-panel: var(--card);\n  --viz-border: var(--border);\n  --viz-text: var(--foreground);\n  --viz-muted: var(--muted-foreground);\n  --viz-accent: var(--primary);\n  --viz-accent-text: var(--primary-foreground);\n  --viz-accent-bg: var(--accent);\n  --viz-font-size: var(--font-size-base);\n  --viz-warning: var(--destructive);\n}\n\n:root[data-theme="light"] {\n  color-scheme: light;\n}\n\n:root[data-theme="dark"] {\n  color-scheme: dark;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nhtml > body {\n  /* Preserve MCP aliases for older inline renderers without creating :root cycles. */\n  --color-background-primary: var(\n    --background,\n    light-dark(rgb(255 255 255), rgb(24 24 24))\n  );\n  --color-text-primary: var(\n    --foreground,\n    light-dark(rgb(26 28 31), rgb(255 255 255))\n  );\n  --color-border-secondary: var(\n    --border,\n    light-dark(rgb(26 28 31 / 8%), rgb(255 255 255 / 8.2%))\n  );\n\n  margin: 0;\n  padding: var(--visualize-paint-gutter, 0px);\n  color: var(--foreground);\n  background: transparent !important;\n  font-family: var(--font-sans) !important;\n  -webkit-font-smoothing: antialiased;\n  font-size: var(--font-size-base);\n  line-height: calc(var(--font-size-base) * 1.625);\n  font-weight: var(--font-weight-normal);\n}\n\n.cursor-interaction {\n  cursor: var(--cursor-interaction, pointer);\n}\n\na {\n  color: color-mix(in srgb, var(--viz-accent) 80%, var(--viz-text) 20%);\n  cursor: var(--cursor-interaction, pointer);\n  text-decoration: none;\n  text-underline-offset: 2px;\n  font-weight: inherit;\n}\n\na:is(:hover, :focus-visible) {\n  text-decoration-line: underline;\n  text-decoration-style: dashed;\n  text-decoration-thickness: 0.5px;\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\np {\n  margin-block: 0;\n}\np,\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nli,\n.table {\n  font-family: var(--font-sans);\n}\n\nh1 {\n  font-size: calc(var(--font-size-base) * 1.5);\n  line-height: 1.3333333333;\n}\n\nh2 {\n  font-size: calc(var(--font-size-base) * 1.25);\n  line-height: 1.4;\n}\nh3 {\n  font-size: calc(var(--font-size-base) * 1.125);\n  line-height: 1.5555555556;\n}\nh4 {\n  font-size: var(--font-size-base);\n  line-height: 1.5;\n}\nh5,\nh6 {\n  font-size: var(--font-size-base);\n  line-height: calc(var(--font-size-base) * 1.625);\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nb,\nstrong,\nth {\n  font-weight: 600;\n}\n\ncode:not(pre code) {\n  display: inline;\n  padding: 1px 6px;\n  border-radius: var(--radius-sm);\n  corner-shape: var(--corner-shape);\n  background: var(--muted);\n  font-family: var(--font-mono);\n  font-size: 0.92em;\n  overflow-wrap: anywhere;\n  -webkit-box-decoration-break: clone;\n  box-decoration-break: clone;\n  word-break: break-word;\n}\npre,\npre code {\n  font-family: var(--font-mono);\n  font-size: 12px;\n  line-height: 20px;\n}\n\n.table-responsive {\n  width: 100%;\n  overflow-x: auto;\n  scrollbar-width: thin;\n}\n\n.table {\n  width: 100%;\n  color: var(--foreground);\n  font: inherit;\n  text-align: start;\n  border-collapse: separate;\n  border-spacing: 0;\n  font-size: calc(var(--font-size-base) * 0.875);\n  line-height: calc(var(--font-size-base) * 1.625);\n  font-family: var(--font-sans);\n}\n\n.table :is(th, td) {\n  padding-block: 10px;\n  padding-inline: 0 24px;\n  overflow-wrap: anywhere;\n  border-bottom: 1px solid var(--border);\n  text-align: start;\n  vertical-align: top;\n  border-bottom-color: color-mix(in srgb, var(--foreground) 5%, transparent);\n}\n.table :is(th, td):not(:last-child) {\n  padding-inline-end: calc(var(--font-size-base) * 1.5);\n}\n\n.table-responsive > .table :is(th, td) {\n  overflow-wrap: break-word;\n}\n\n.table :is(th, td):last-child {\n  padding-inline-end: 0;\n}\n\n.table :is(caption, thead th) {\n  font-weight: 600;\n}\n\n.table thead :is(th, td) {\n  border-bottom-color: var(--border-strong, var(--input));\n  padding-block: calc(var(--font-size-base) / 2);\n  line-height: var(--font-size-base);\n}\n\n.table tbody tr:last-child :is(th, td) {\n  border-bottom: 0;\n}\n.table tbody :is(th, td) {\n  padding-block: calc(var(--font-size-base) * 0.625);\n}\n\n.table.table-sm :is(th, td) {\n  padding-block: 8px;\n}\n\n.table.table-sm :is(th, td):not(:last-child) {\n  padding-inline-end: 16px;\n}\n\n.table :is(.text-end, [align="right"]) {\n  text-align: end;\n  font-variant-numeric: tabular-nums;\n}\n\n.table :is(.text-center, [align="center"]) {\n  text-align: center;\n}\n\n.table .text-nowrap {\n  white-space: nowrap;\n}\n\n#widget {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  width: 100%;\n  padding: 0;\n  background: transparent !important;\n}\n\n.card {\n  min-width: 0;\n  padding: 12px;\n  overflow: hidden;\n  overflow-wrap: break-word;\n  border-radius: var(--radius-2xl);\n  corner-shape: var(--corner-shape);\n  color: var(--card-foreground);\n  background: var(--card);\n}\n\n.widget {\n  min-width: 0;\n  overflow: hidden;\n  border: 0;\n  border-radius: var(--radius-lg);\n  corner-shape: var(--corner-shape);\n  box-shadow: 0 0 0 0.5px var(--border-strong, var(--border));\n  color: var(--foreground);\n  background: var(--background);\n}\n\n#widget > :not(.card, .widget, .progress) {\n  width: 100% !important;\n  max-width: none !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border: 0 !important;\n  border-radius: 0 !important;\n  background: transparent !important;\n  box-shadow: none !important;\n}\n\n.tooltip {\n  position: fixed;\n  z-index: 50;\n  top: 0;\n  left: 0;\n  width: max-content;\n  max-width: min(\n    20rem,\n    var(--tooltip-available-width, calc(100vw - 10px)),\n    calc(100vw - 10px)\n  );\n  max-height: min(\n    var(--tooltip-available-height, calc(100vh - 10px)),\n    calc(100vh - 10px)\n  );\n  border: 1px solid var(--border);\n  corner-shape: var(--corner-shape);\n  overflow-wrap: break-word;\n  white-space: normal;\n  pointer-events: none;\n  user-select: none;\n  font-family: var(--font-sans);\n  padding: 5px 12px;\n  border-color: color-mix(\n    in oklab,\n    light-dark(var(--primary-foreground), var(--foreground)) 5%,\n    transparent\n  );\n  border-radius: var(--radius-2xl);\n  color: light-dark(var(--primary-foreground), var(--foreground));\n  background: light-dark(var(--foreground), var(--popover));\n  box-shadow: 0 8px 18px rgb(15 23 42 / 20%);\n  letter-spacing: -0.15px;\n  font-size: calc(var(--font-size-base) * 14 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 14 / 16), 1px);\n  font-weight: 600;\n  line-height: 18px;\n  text-align: center;\n}\n\n.viz-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(max(180px, 24%), 1fr));\n  gap: 10px;\n}\n\n.viz-stat {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.viz-stat-value {\n  font-size: var(--font-size-h2);\n  font-weight: var(--font-weight-medium);\n  line-height: 1.25;\n}\n\n.viz-row {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 10px;\n}\n\nhr {\n  width: 100%;\n  height: 1px;\n  margin-block: 6px;\n  border: 0;\n  background: var(--border);\n}\n\n.nav {\n  display: flex;\n  min-width: 0;\n  align-items: center;\n  gap: 4px;\n}\n\n.progress {\n  display: flex;\n  height: 8px;\n  margin-block: calc((var(--line-height-normal, 1.5em) - 8px) / 2);\n  overflow: hidden;\n  border: 0;\n  border-radius: var(--radius-full);\n  background: var(--muted);\n}\n\n.progress-bar:only-child {\n  border-radius: var(--radius-full);\n}\n\n.progress-bar {\n  height: 100%;\n  flex-shrink: 0;\n  border: 0;\n  background: var(--viz-series-1);\n}\n\n.viz-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 4px 8px;\n  border-radius: var(--radius-sm);\n  color: color-mix(in srgb, var(--foreground) 40%, var(--muted-foreground));\n  background: color-mix(in srgb, var(--foreground) 5%, transparent);\n  font-family: var(--font-sans);\n  font-size: calc(var(--font-size-base) * 14 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 14 / 16), 1px);\n  font-weight: var(--font-weight-normal);\n  line-height: 1;\n}\n\nsmall,\n.text-small {\n  font-size: var(--font-size-small);\n  line-height: var(--line-height-small);\n}\n\n.text-muted {\n  color: var(--muted-foreground);\n}\n\n.tabular-nums {\n  font-variant-numeric: tabular-nums;\n}\n\n.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n.viz-controls {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n}\n\n.viz-controls > .form-label {\n  display: grid;\n  min-width: min(100%, 260px);\n  flex: 1 1 280px;\n  grid-template-columns: minmax(0, 1fr) auto;\n  align-items: baseline;\n  gap: 2px 12px;\n  margin-bottom: 0;\n}\n\n.viz-controls > .form-label > :is(.form-control, .form-range, .form-select) {\n  grid-column: 1 / -1;\n}\n\n.btn,\n.nav-link,\n.form-check-input,\n.form-control,\n.form-range,\n.form-select {\n  font: inherit;\n}\n\n/* Match inline alignment without overriding a containing flex or grid layout. */\n.btn,\n.nav-link,\n.form-control,\n.form-select,\n.form-range,\n.form-check {\n  vertical-align: middle;\n}\n\n.btn,\n.nav-link {\n  --btn-size: calc(12px + 2 * var(--control-spacing, 12px));\n  appearance: button;\n  display: inline-flex;\n  inline-size: fit-content;\n  max-inline-size: 100%;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  margin: 0;\n  padding: 0 8px;\n  -webkit-app-region: no-drag;\n  border: 1px solid var(--input);\n  corner-shape: var(--corner-shape);\n  cursor: var(--cursor-interaction, pointer);\n  text-align: center;\n  text-decoration: none;\n  white-space: nowrap;\n  user-select: none;\n  -webkit-font-smoothing: inherit;\n  font-family: var(--font-sans);\n  height: fit-content;\n  min-height: var(--btn-size);\n  padding-inline: var(--control-spacing, 12px);\n  border-color: transparent;\n  border-radius: var(--radius-full);\n  color: var(--foreground);\n  background: color-mix(in srgb, var(--foreground) 5%, transparent);\n  font-size: calc(var(--font-size-base) * 14 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 14 / 16), 1px);\n  font-weight: var(--font-weight-normal);\n  line-height: 18px;\n}\n\n.btn {\n  border-color: var(--border);\n  color: var(--secondary-foreground);\n  background: var(--secondary);\n}\n\n/* Codex Button size="compact"; appearance stays with the button variant. */\n.btn-sm {\n  --btn-size: 24px;\n  padding-inline: 8px;\n  font-size: calc(var(--font-size-base) * 12 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 12 / 16), 1px);\n  line-height: 16px;\n}\n\n.btn:is(.btn-block, .viz-tile) {\n  inline-size: 100%;\n}\n\n.btn.viz-tile {\n  min-width: 0;\n  overflow-wrap: anywhere;\n  white-space: normal;\n}\n\na.btn {\n  cursor: var(--cursor-interaction, pointer);\n  text-decoration: none;\n}\n\n.btn:not(:disabled):hover {\n  background: light-dark(\n    color-mix(in srgb, var(--foreground) 5.5%, transparent),\n    color-mix(in srgb, var(--foreground) 8%, transparent)\n  );\n}\n\n.nav-link:not(:disabled):not([aria-disabled="true"]):hover {\n  background: color-mix(in srgb, var(--foreground) 10%, transparent);\n}\n\n.btn-primary {\n  border-color: var(--border);\n  color: var(--primary-foreground);\n  background: var(--foreground);\n  background-clip: border-box;\n}\n\n.btn-primary .text-muted {\n  color: color-mix(in srgb, var(--primary-foreground) 50%, transparent);\n}\n\n.btn-primary:not(:disabled):hover {\n  background: color-mix(in srgb, var(--foreground) 80%, transparent);\n  background-clip: border-box;\n}\n\n.btn-ghost {\n  border-color: transparent;\n  color: var(--muted-foreground);\n  background: transparent;\n}\n\n.btn-ghost:not(:disabled):hover {\n  color: var(--muted-foreground);\n  background: light-dark(\n    color-mix(in srgb, var(--foreground) 5.5%, transparent),\n    color-mix(in srgb, var(--foreground) 8%, transparent)\n  );\n}\n\n.nav-pills .nav-link {\n  min-width: 0;\n  border-color: transparent;\n  color: var(--muted-foreground);\n  background: transparent;\n}\n\n.nav-justified .nav-link {\n  flex: 1 1 0;\n  overflow-wrap: anywhere;\n  white-space: normal;\n}\n\n.nav-pills .nav-link.active {\n  color: var(--foreground);\n  background: var(--muted);\n}\n\n/* Shared preview chrome; product styles stay inside each variant. */\n.viz-dotted-background {\n  background-image: radial-gradient(\n    circle,\n    color-mix(in srgb, var(--foreground) 14%, transparent) 0.8px,\n    transparent 0.8px\n  );\n  background-position: center;\n  background-size: 16px 16px;\n}\n\n.viz-carousel {\n  position: relative;\n  min-width: 0;\n}\n\n.viz-carousel:has(> .viz-carousel-controls) {\n  min-height: calc(60px + var(--viz-carousel-picker-height, 0px));\n  padding-bottom: 60px;\n}\n\n.viz-carousel > [data-variant][hidden] {\n  display: none !important;\n}\n\n.viz-carousel > [data-variant] {\n  isolation: isolate;\n}\n\n.viz-carousel-controls {\n  --viz-carousel-hover: light-dark(\n    color-mix(in srgb, var(--foreground) 5.4%, transparent),\n    color-mix(in srgb, var(--foreground) 7.8%, transparent)\n  );\n  position: absolute;\n  z-index: 2;\n  bottom: 8px;\n  left: 50%;\n  display: flex;\n  width: max-content;\n  /* Leave room for the host\'s design-controls launcher at the trailing edge. */\n  max-width: calc(100% - 96px);\n  align-items: center;\n  gap: 0;\n  padding: 0;\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  color: var(--foreground);\n  background: var(--background);\n  font-family: var(--font-sans);\n  /* Match the settings dropdown chrome independently of the content font size. */\n  font-size: 13px;\n  font-weight: var(--font-weight-normal);\n  line-height: 18px;\n  transform: translateX(-50%);\n  user-select: none;\n}\n\n/* Keep authored mockup button styles out of the shared carousel chrome. */\n.viz-carousel-controls button,\n.viz-carousel-picker > summary {\n  display: flex !important;\n  height: auto !important;\n  min-height: 30px;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 4px;\n  padding: 0 6px !important;\n  -webkit-app-region: no-drag;\n  border: 0 !important;\n  border-radius: 14px !important;\n  color: inherit !important;\n  background: transparent !important;\n  font: inherit !important;\n  -webkit-tap-highlight-color: transparent;\n}\n\n.viz-carousel-controls > button,\n.viz-carousel-picker > summary {\n  position: relative;\n  isolation: isolate;\n}\n\n.viz-carousel-controls > button {\n  --icon-size: 16px;\n  width: 30px !important;\n  padding: 0 !important;\n}\n\n.viz-carousel-picker > summary {\n  padding-inline: 12px !important;\n}\n\n.viz-carousel-controls .viz-carousel-caret {\n  width: 14px;\n  height: 14px;\n  flex: none;\n  margin: 0;\n  color: inherit;\n  transform: rotate(180deg);\n}\n\n.viz-carousel-controls > button > svg,\n.viz-carousel-controls .viz-carousel-caret,\n.viz-carousel-count {\n  opacity: 0.5;\n}\n\n.viz-carousel-controls > button::before,\n.viz-carousel-picker > summary::before {\n  position: absolute;\n  z-index: -1;\n  inset: 3px;\n  border-radius: 12px;\n  content: "";\n  pointer-events: none;\n}\n\n.viz-carousel-controls > button:hover::before,\n.viz-carousel-picker > summary:hover::before {\n  background: var(--viz-carousel-hover);\n}\n\n.viz-carousel-controls > button,\n.viz-carousel-controls [data-lucide],\n.viz-carousel-controls .lucide {\n  flex-shrink: 0;\n}\n\n.viz-carousel-picker {\n  min-width: 0;\n}\n\n.viz-carousel-picker > summary {\n  min-width: 0;\n  list-style: none;\n}\n\n.viz-carousel-picker > summary::-webkit-details-marker {\n  display: none;\n}\n\n.viz-carousel-count {\n  flex-shrink: 0;\n  white-space: nowrap;\n}\n\n.viz-carousel-name {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.viz-carousel-options {\n  position: absolute;\n  right: 0;\n  bottom: calc(100% + 4px);\n  left: 0;\n  display: flex;\n  max-height: 240px;\n  flex-direction: column;\n  gap: 2px;\n  overflow: auto;\n  padding: 4px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  background: var(--background);\n  box-shadow: 0 4px 12px light-dark(rgb(0 0 0 / 6%), rgb(0 0 0 / 25%));\n}\n\n.viz-carousel-options > button {\n  border-radius: max(0px, calc(var(--radius-lg) - 5px)) !important;\n  width: 100% !important;\n  min-height: 28px;\n  justify-content: flex-start !important;\n  padding: 4px 8px !important;\n  font-size: var(--font-size-small) !important;\n  text-align: start;\n  white-space: normal;\n  overflow-wrap: anywhere;\n}\n\n.viz-carousel-options > [aria-current="true"],\n.viz-carousel-options > button:hover {\n  background: var(--viz-carousel-hover) !important;\n}\n\n.btn:disabled,\n.nav-link:disabled,\n.nav-link[aria-disabled="true"] {\n  cursor: not-allowed;\n  opacity: 0.4;\n}\n\n[data-lucide] {\n  stroke-width: 1.6;\n}\n\n.form-label {\n  display: block;\n  margin-bottom: 6px;\n  color: var(--foreground);\n}\n\n.form-control {\n  display: block;\n  width: 100%;\n  padding: 0 8px;\n  outline: none;\n  border: 1px solid var(--input);\n  corner-shape: var(--corner-shape);\n  color: var(--foreground);\n  font-family: var(--font-sans);\n  height: calc(12px + 2 * var(--control-spacing, 12px));\n  min-height: calc(12px + 2 * var(--control-spacing, 12px));\n  padding-inline: calc(4px + var(--control-spacing, 12px) / 2);\n  border-color: var(--input);\n  border-radius: var(--radius-md);\n  background: color-mix(in srgb, var(--popover) 96%, transparent);\n  font-size: calc(var(--font-size-base) * 14 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 14 / 16), 1px);\n  font-weight: var(--font-weight-normal);\n  line-height: 1.4285714286;\n}\n.form-control:is(\n  [type="file"],\n  [type="date"],\n  [type="datetime-local"],\n  [type="month"],\n  [type="week"],\n  [type="color"]\n) {\n  height: calc(12px + 2 * var(--control-spacing, 12px));\n  min-height: calc(12px + 2 * var(--control-spacing, 12px));\n  line-height: 18px;\n}\n.form-control:is(\n  [type="date"],\n  [type="datetime-local"],\n  [type="month"],\n  [type="week"]\n) {\n  padding-inline: var(--control-spacing, 12px);\n}\n\n.form-control::placeholder {\n  color: var(--muted-foreground);\n}\n\n.form-control[type="file"] {\n  overflow: hidden;\n  cursor: var(--cursor-interaction, pointer);\n  padding: 0;\n}\n\n.form-control[type="file"]::file-selector-button {\n  padding: 0 8px;\n  border: 0;\n  border-right: 1px solid var(--input);\n  color: var(--secondary-foreground);\n  background: var(--secondary);\n  cursor: inherit;\n  font: inherit;\n  min-height: calc(10px + 2 * var(--control-spacing, 12px));\n  padding-inline: var(--control-spacing, 12px);\n  margin-inline-end: var(--control-spacing, 12px);\n}\n\n.form-control[type="file"]:not(:disabled):hover::file-selector-button {\n  background: color-mix(in srgb, var(--foreground) 6%, var(--secondary));\n}\n\n.form-control-color[type="color"] {\n  width: 40px;\n  height: calc(12px + 2 * var(--control-spacing, 12px));\n  padding: 3px;\n  cursor: var(--cursor-interaction, pointer);\n}\n\n.form-control-color[type="color"]::-webkit-color-swatch-wrapper {\n  padding: 0;\n}\n\n.form-control-color[type="color"]::-webkit-color-swatch {\n  border: 0;\n  border-radius: calc(var(--radius-lg) - 4px);\n  corner-shape: var(--corner-shape);\n}\n\ntextarea.form-control {\n  height: auto;\n  resize: vertical;\n  min-height: 96px;\n  padding: 8px 10px;\n}\n\n.form-control:focus-visible {\n  border-color: var(--ring);\n  box-shadow: none;\n}\n.form-control:disabled {\n  color: var(--muted-foreground);\n  background: color-mix(in srgb, var(--foreground) 5%, transparent);\n  opacity: 1;\n}\n.form-control[aria-invalid="true"] {\n  border-color: var(--red);\n  box-shadow: 0 0 0 2px color-mix(in srgb, var(--red) 20%, transparent);\n}\n\n.form-control:disabled,\n.form-select:disabled {\n  cursor: not-allowed;\n}\n\n.form-select {\n  appearance: none;\n  display: block;\n  width: 100%;\n  height: fit-content;\n  min-height: calc(12px + 2 * var(--control-spacing, 12px));\n  margin: 0;\n  /* The secondary icon role is 14px at compact density and 16px at web density. */\n  --icon-size: calc(10px + var(--control-spacing, 12px) / 2);\n  /* Settings dropdowns retain a 12px inset and a 4px text-to-chevron gap. */\n  padding: 0 calc(16px + var(--icon-size)) 0 12px;\n  outline: none;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-full);\n  corner-shape: var(--corner-shape);\n  color: var(--foreground);\n  background-color: var(--secondary);\n  background-image:\n    linear-gradient(\n      45deg,\n      transparent calc(50% - 0.6px),\n      var(--muted-foreground) calc(50% - 0.6px) calc(50% + 0.6px),\n      transparent calc(50% + 0.6px)\n    ),\n    linear-gradient(\n      135deg,\n      transparent calc(50% - 0.6px),\n      var(--muted-foreground) calc(50% - 0.6px) calc(50% + 0.6px),\n      transparent calc(50% + 0.6px)\n    );\n  background-position:\n    calc(100% - 12px - var(--icon-size) / 2) 50%,\n    calc(100% - 12px - var(--icon-size) * 0.18) 50%;\n  background-repeat: no-repeat;\n  background-size: calc(var(--icon-size) * 0.32) calc(var(--icon-size) * 0.32);\n  cursor: var(--cursor-interaction, default);\n  font-size: calc(var(--font-size-base) * 14 / 16);\n  font-size: round(nearest, calc(var(--font-size-base) * 14 / 16), 1px);\n  font-weight: var(--font-weight-normal);\n  line-height: 18px;\n}\n\n.form-select :is(option, optgroup) {\n  color: var(--popover-foreground);\n  background-color: var(--popover);\n}\n\n.form-select :is(option, optgroup):disabled {\n  color: var(--muted-foreground);\n}\n\n.form-select:not(:disabled):hover {\n  background-color: light-dark(\n    color-mix(in srgb, var(--foreground) 5.5%, transparent),\n    color-mix(in srgb, var(--foreground) 8%, transparent)\n  );\n}\n\n.form-select:focus-visible {\n  box-shadow: 0 0 0 2px var(--ring);\n}\n.form-select:disabled {\n  opacity: 0.4;\n}\n\n.form-check {\n  display: flex;\n  min-height: calc(12px + 2 * var(--control-spacing, 12px));\n  align-items: center;\n  gap: 6px;\n}\n\n.form-check-input {\n  appearance: none;\n  width: 14px;\n  height: 14px;\n  flex: 0 0 auto;\n  margin: 0;\n  border: 1px solid var(--input);\n  color: var(--primary-foreground);\n  background-color: transparent;\n  cursor: var(--cursor-interaction, default);\n  transition:\n    background-color 150ms,\n    border-color 150ms,\n    box-shadow 150ms;\n}\n\n.form-check:not(.form-switch) .form-check-input[type="checkbox"] {\n  corner-shape: round;\n  box-shadow: var(--shadow-sm);\n  position: relative;\n  width: calc(10px + var(--control-spacing, 12px) / 2);\n  height: calc(10px + var(--control-spacing, 12px) / 2);\n  border-color: var(--border-strong, var(--input));\n  border-radius: calc(var(--radius-sm) / 2);\n  background-color: transparent;\n  color: var(--foreground);\n}\n\n.form-check:not(.form-switch)\n  .form-check-input:not(:disabled):not(:checked):hover {\n  background-color: var(--card);\n}\n\n.form-check:not(.form-switch)\n  .form-check-input[type="checkbox"]:is(:checked, :indeterminate) {\n  border-color: var(--border-strong, var(--input));\n  background-color: color-mix(in srgb, var(--popover) 96%, transparent);\n}\n\n.form-check:not(.form-switch)\n  .form-check-input[type="checkbox"]:checked::before {\n  display: block;\n  width: 100%;\n  height: 100%;\n  background: var(--primary-foreground);\n  content: "";\n  mask: var(--checkmark-image) center / 12px 12px no-repeat;\n  background-color: var(--foreground);\n}\n.form-check:not(.form-switch)\n  .form-check-input[type="checkbox"]:indeterminate::before {\n  position: absolute;\n  inset: 0;\n  display: block;\n  width: 65%;\n  height: 6.65%;\n  margin: auto;\n  border-radius: var(--radius-full);\n  background: var(--foreground);\n  mask: none;\n  content: "";\n}\n\n.form-check-input[type="radio"] {\n  border-radius: var(--radius-full);\n  width: 16px;\n  height: 16px;\n  border: 0;\n  box-shadow: inset 0 0 0 1px var(--input);\n}\n\n.form-check-input[type="radio"]:checked {\n  border: 0;\n  background: radial-gradient(\n    circle,\n    var(--primary-foreground) 0 3px,\n    var(--foreground) 3px\n  );\n  box-shadow: none;\n}\n\n.form-check:not(.form-switch) .form-check-input:focus-visible {\n  outline: 2px solid var(--ring);\n  outline-offset: 2px;\n}\n.form-check:not(.form-switch) .form-check-input[type="checkbox"]:focus-visible {\n  border-color: var(--ring);\n  outline: none;\n  box-shadow: 0 0 0 2px var(--ring);\n}\n\n.form-check:not(.form-switch) .form-check-input:disabled {\n  cursor: not-allowed;\n  pointer-events: none;\n}\n\n.form-check:not(.form-switch) .form-check-input:disabled + .form-check-label {\n  cursor: not-allowed;\n}\n.form-check:not(.form-switch) .form-check-input[type="radio"]:disabled,\n.form-check:not(.form-switch)\n  .form-check-input[type="radio"]:disabled\n  + .form-check-label {\n  opacity: 0.5;\n}\n\n.form-switch .form-check-input:disabled,\n.form-switch .form-check-input:disabled + .form-check-label {\n  cursor: not-allowed;\n  opacity: 0.6;\n}\n\n.form-check-label {\n  color: var(--foreground);\n  cursor: var(--cursor-interaction, default);\n}\n\n.form-switch .form-check-input {\n  position: relative;\n  width: 32px;\n  height: 20px;\n  border: 0;\n  border-radius: var(--radius-full);\n  background: var(--muted);\n  box-shadow: none;\n  transition: background-color 200ms cubic-bezier(0, 0, 0.2, 1);\n}\n\n.form-switch .form-check-input::before {\n  position: absolute;\n  top: 50%;\n  left: 0;\n  width: 16px;\n  height: 16px;\n  box-sizing: border-box;\n  border: 1px solid light-dark(var(--primary-foreground), var(--foreground));\n  border-radius: var(--radius-full);\n  box-shadow: var(--shadow-sm);\n  content: "";\n  transform: translate(2px, -50%);\n  transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);\n  border-color: #fff;\n  background: #fff;\n}\n\n.form-switch .form-check-input:checked {\n  background: var(--blue);\n}\n\n.form-switch .form-check-input:checked::before {\n  transform: translate(14px, -50%);\n}\n\n.form-switch .form-check-input:focus-visible {\n  box-shadow: 0 0 0 2px var(--ring);\n  outline: none;\n}\n\n.form-range {\n  appearance: none;\n  display: block;\n  width: 100%;\n  flex: 1;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  accent-color: var(--primary);\n  height: calc(12px + 2 * var(--control-spacing, 12px));\n  min-height: calc(12px + 2 * var(--control-spacing, 12px));\n  outline: none;\n  border-radius: var(--radius-full);\n  color: var(--foreground);\n  background: transparent;\n}\n\n.form-range::-webkit-slider-runnable-track {\n  background: var(--form-range-track, var(--border));\n  height: 2px;\n  border-radius: var(--radius-full);\n}\n\n.form-range::-webkit-slider-thumb {\n  appearance: none;\n  width: 20px;\n  height: 20px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-full);\n  margin-top: -9px;\n  border-color: transparent;\n  background: currentColor;\n  box-shadow: var(--shadow-sm);\n}\n\n/* Outline the native track and thumb, preserving the larger input hit area. */\n.form-range:focus-visible::-webkit-slider-runnable-track {\n  outline: 2px auto Highlight;\n  outline-color: -webkit-focus-ring-color;\n}\n\n.form-range::-moz-range-track {\n  background: var(--form-range-track, var(--border));\n  height: 2px;\n  border-radius: var(--radius-full);\n}\n\n.form-range::-moz-range-thumb {\n  width: 20px;\n  height: 20px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-full);\n  border-color: transparent;\n  background: currentColor;\n  box-shadow: var(--shadow-sm);\n}\n\n.form-range:focus-visible::-moz-range-thumb {\n  outline: 2px solid Highlight;\n  outline-offset: 2px;\n}\n\n.form-range:disabled {\n  opacity: 1;\n  cursor: default;\n}\n\n.btn:not(.btn-primary, .viz-tile):is(\n  [aria-pressed="true"],\n  [aria-selected="true"],\n  .is-selected\n) {\n  border-color: transparent;\n  color: var(--primary-foreground);\n  background: var(--blue);\n}\n\n.btn.viz-tile:is([aria-pressed="true"], [aria-selected="true"], .is-selected) {\n  border-color: var(--primary);\n  box-shadow: inset 0 0 0 1px var(--primary);\n}\n\n.btn:focus-visible,\n.nav-link:focus-visible {\n  outline-offset: 2px;\n  outline: none;\n  box-shadow: 0 0 0 2px var(--ring);\n}\n\n.viz-carousel-controls :is(button, summary):focus-visible {\n  outline: 2px solid var(--ring) !important;\n  outline-offset: 2px !important;\n}\n\n/* Web recipes are the default, including on renderers without inline style queries. */\n@supports (border-radius: if(style(--corner-shape: round): 1px; else: 2px)) {\n  /* Match the host\'s proportional text-sm scale at every text preference. */\n  .tooltip,\n  .viz-badge,\n  .btn,\n  .nav-link,\n  .form-control,\n  .form-select {\n    font-size: if(\n      style(--corner-shape: round): round(\n          nearest,\n          calc(var(--font-size-base) * 14 / 16),\n          1px\n        );\n        else: round(nearest, calc(var(--font-size-base) * 13 / 14), 1px)\n    );\n  }\n\n  .btn-sm {\n    font-size: if(\n      style(--corner-shape: round): round(\n          nearest,\n          calc(var(--font-size-base) * 12 / 16),\n          1px\n        );\n        else: round(nearest, calc(var(--font-size-base) * 12 / 14), 1px)\n    );\n  }\n\n  .btn,\n  .nav-link,\n  .form-select {\n    border-radius: if(\n      style(--corner-shape: round): var(--radius-full); else: var(--radius-lg)\n    );\n  }\n\n  .form-check:not(.form-switch) .form-check-input[type="checkbox"] {\n    border-radius: if(\n      style(--corner-shape: round): calc(var(--radius-sm) / 2);\n        else: calc(var(--radius-lg) * 0.4)\n    );\n  }\n\n  .tooltip {\n    font-weight: if(\n      style(--corner-shape: round): 600; else: var(--font-weight-normal)\n    );\n  }\n}\n\n@media (pointer: coarse) {\n  .viz-carousel:has(> .viz-carousel-controls) {\n    min-height: calc(76px + var(--viz-carousel-picker-height, 0px));\n    padding-bottom: 76px;\n  }\n\n  .btn,\n  .nav-link,\n  .viz-carousel-controls button,\n  .viz-carousel-picker > summary,\n  .form-control,\n  .form-select {\n    --btn-size: 44px;\n    min-width: 44px;\n    min-height: 44px;\n  }\n\n  /* Keep small-screen WebKit from zooming when a text field receives focus. */\n  .form-control,\n  .form-select {\n    font-size: max(16px, calc(var(--font-size-base) * 14 / 16));\n    font-size: max(\n      16px,\n      round(nearest, calc(var(--font-size-base) * 14 / 16), 1px)\n    );\n  }\n  .form-control:is(\n    [type="file"],\n    [type="date"],\n    [type="datetime-local"],\n    [type="month"],\n    [type="week"],\n    [type="time"],\n    [type="color"]\n  ) {\n    height: 44px;\n    min-height: 44px;\n    font-size: max(16px, calc(var(--font-size-base) * 14 / 16));\n    font-size: max(\n      16px,\n      round(nearest, calc(var(--font-size-base) * 14 / 16), 1px)\n    );\n  }\n\n  .form-control[type="file"]::file-selector-button {\n    min-width: 44px;\n    min-height: 44px;\n  }\n\n  .form-control-color[type="color"] {\n    width: 44px;\n    height: 44px;\n  }\n\n  .form-control:is(\n    [type="date"],\n    [type="datetime-local"],\n    [type="month"],\n    [type="time"],\n    [type="week"]\n  ) {\n    min-width: 0;\n    max-width: 100%;\n    padding-block: 8px;\n  }\n\n  .form-check {\n    min-height: 44px;\n    padding-inline: 15px;\n  }\n\n  .form-check-input {\n    position: relative;\n  }\n\n  .form-check-input::after {\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    width: 44px;\n    height: 44px;\n    content: "";\n    transform: translate(-50%, -50%);\n  }\n\n  .form-check-label {\n    display: inline-flex;\n    min-width: 44px;\n    min-height: 44px;\n    align-items: center;\n  }\n\n  .form-range {\n    height: 44px;\n    touch-action: pan-y;\n  }\n}\n\nsvg {\n  display: block;\n  max-width: 100%;\n  height: auto;\n}\n\n#widget > svg {\n  width: 100%;\n}\n\n/* Model-authored chart rules can otherwise stretch icons after these styles load. */\nsvg.lucide {\n  display: block;\n  width: var(--icon-size) !important;\n  height: var(--icon-size) !important;\n  flex: none;\n  margin: 0 !important;\n  stroke-width: 1.6;\n}\n\n.text-warning,\n.text-destructive {\n  color: var(--destructive);\n}\n',title:i,share:c}=e,p=`<!doctype html>
<html lang="${d(t)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="${s}">
<title>${d(i)}</title>
</head>
<body>
<script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__<\/script>
<script>${'(() => {\n  const root = document.documentElement;\n  const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");\n  const apply = Reflect.apply;\n  const isArray = Array.isArray;\n  const hasOwn = Object.hasOwn;\n  const parentWindow = globalThis.parent;\n  const stringify = JSON.stringify;\n  const parse = JSON.parse;\n  const encode = TextEncoder.prototype.encode.bind(new TextEncoder());\n  const initialStateElement = document.getElementById(\n    "codex-visualization-widget-state",\n  );\n  const initialGlobals = parse(initialStateElement?.textContent ?? "{}");\n  initialStateElement?.remove();\n  /** @type {Record<string, unknown> | null} */\n  let state = initialGlobals.widgetState ?? null;\n  const statePersistence = initialGlobals.statePersistence ?? "none";\n  let nextStateRequestId = 0;\n  /** @type {Map<number, { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof globalThis.setTimeout>; serializedState: string }>} */\n  const pendingStateWrites = new Map();\n  const persistenceError = () =>\n    Object.assign(\n      new Error("The host could not persist the widget state update"),\n      {\n        code: -32000,\n        data: { code: "widget_state_persistence_failed", retryable: false },\n      },\n    );\n  /**\n   * @param {object} prototype\n   * @param {string} property\n   */\n  const getPrototypeGetter = (prototype, property) => {\n    // oxlint-disable-next-line typescript/unbound-method -- invoked through captured Reflect.apply\n    const getter = Object.getOwnPropertyDescriptor(prototype, property)?.get;\n    if (getter == null) {\n      throw new Error(`Missing ${property} getter`);\n    }\n    return getter;\n  };\n  const getMessageData = getPrototypeGetter(MessageEvent.prototype, "data");\n  const getMessagePorts = getPrototypeGetter(MessageEvent.prototype, "ports");\n  const getMessageSource = getPrototypeGetter(MessageEvent.prototype, "source");\n  // oxlint-disable-next-line typescript/unbound-method -- captured before the untrusted fragment runs\n  const addHostMessageListener = MessagePort.prototype.addEventListener;\n  // oxlint-disable-next-line typescript/unbound-method -- captured before the untrusted fragment runs\n  const postHostMessage = MessagePort.prototype.postMessage;\n  // oxlint-disable-next-line typescript/unbound-method -- captured before the untrusted fragment runs\n  const startHostPort = MessagePort.prototype.start;\n  // oxlint-disable-next-line typescript/unbound-method -- captured before the untrusted fragment runs\n  const stopMessagePropagation = Event.prototype.stopImmediatePropagation;\n  /** @type {MessagePort | null} */\n  let hostPort = null;\n  const postToHost = (type, payload) => {\n    if (hostPort != null) {\n      apply(postHostMessage, hostPort, [{ type, ...payload }]);\n    }\n  };\n  const openExternal = ({ href }) => {\n    if (globalThis.navigator.userActivation?.isActive === true) {\n      postToHost("open-external", { href });\n    }\n  };\n  const sendFollowUpMessage = ({ context, prompt, title }) => {\n    if (globalThis.navigator.userActivation?.isActive === true) {\n      postToHost("follow-up", { context, prompt, title });\n    }\n    return Promise.resolve();\n  };\n  /**\n   * @param {Record<string, unknown> | ((previous: Record<string, unknown> | null) => Record<string, unknown>)} next\n   * @returns {Promise<void>}\n   */\n  const setWidgetState = async (next) => {\n    const nextState = typeof next === "function" ? next(state) : next;\n    if (\n      nextState == null ||\n      typeof nextState !== "object" ||\n      isArray(nextState)\n    ) {\n      throw new TypeError("Widget state must be a JSON object");\n    }\n    const inputState = stringify(\n      nextState,\n      (_key, /** @type {unknown} */ value) => {\n        if (\n          typeof value === "undefined" ||\n          typeof value === "function" ||\n          typeof value === "symbol" ||\n          (typeof value === "number" && !Number.isFinite(value))\n        ) {\n          throw new TypeError("Widget state must be a JSON object");\n        }\n        return value;\n      },\n    );\n    const parsedState = parse(inputState);\n    if (\n      parsedState == null ||\n      typeof parsedState !== "object" ||\n      isArray(parsedState)\n    ) {\n      throw new TypeError("Widget state must be a JSON object");\n    }\n    const storedState = {\n      modelContent: null,\n      privateContent: null,\n      ...parsedState,\n    };\n    const serializedState = stringify(storedState);\n    if (encode(serializedState).length > 16 * 1024) {\n      throw new TypeError(\n        "Widget state must be a JSON object of at most 16 KiB",\n      );\n    }\n    if (\n      hasOwn(storedState, "imageIds") &&\n      (!isArray(storedState.imageIds) ||\n        storedState.imageIds.some(\n          (/** @type {unknown} */ id) => typeof id !== "string",\n        ))\n    ) {\n      throw new TypeError("Widget state imageIds must be an array of strings");\n    }\n    if (storedState.imageIds?.length > 0) {\n      throw Object.assign(\n        new TypeError("Visualization state does not support image attachments"),\n        { code: -32602, data: { code: "images_unsupported" } },\n      );\n    }\n    state = storedState;\n    globalThis.openai.widgetState = state;\n    globalThis.dispatchEvent(\n      new CustomEvent("openai:set_globals", {\n        detail: { globals: { widgetState: state } },\n      }),\n    );\n    if (statePersistence === "none") {\n      throw persistenceError();\n    }\n    const id = ++nextStateRequestId;\n    return new Promise((resolve, reject) => {\n      const timeout = globalThis.setTimeout(() => {\n        pendingStateWrites.delete(id);\n        reject(persistenceError());\n      }, 30_000);\n      pendingStateWrites.set(id, { resolve, reject, timeout, serializedState });\n      postToHost("widget-state-write", { id, state: serializedState });\n    });\n  };\n  const bindingElement = document.getElementById("codex-visualization-bindings");\n  const mockElement = document.getElementById("codex-connector-mocks");\n  const fileElement = document.getElementById("codex-preview-files");\n  const connectorGlobals = {};\n  if (bindingElement != null || mockElement != null || fileElement != null) {\n    const bindings = parse(bindingElement?.textContent ?? "{}");\n    bindingElement?.remove();\n    const values = new Map();\n    for (const [name, binding] of Object.entries(bindings)) {\n      if (binding.type === "json") values.set(name, structuredClone(binding.value));\n    }\n    const pending = [bindings];\n    while (pending.length) {\n      const object = pending.pop();\n      Object.freeze(object);\n      for (const child of Object.values(object)) {\n        if (child !== null && typeof child === "object") pending.push(child);\n      }\n    }\n    const updates = [];\n    if (mockElement != null) {\n      const mocks = Object.entries(parse(mockElement.textContent));\n      mockElement.remove();\n      for (const [name, value] of mocks) {\n        values.set(name, value);\n        updates.push({ name, revision: 1, state: "ready", value: { type: "json", value } });\n      }\n    }\n    if (fileElement != null) {\n      const files = parse(fileElement.textContent);\n      fileElement.remove();\n      const blobs = new Map();\n      const urls = [];\n      for (const [name, binding] of Object.entries(bindings)) {\n        if (binding.type !== "file" || !hasOwn(files, binding.path)) continue;\n        const file = files[binding.path];\n        let blob = blobs.get(binding.path);\n        if (blob == null) {\n          const bytes = Uint8Array.fromBase64?.(file.base64) ??\n            Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0));\n          blob = new Blob([bytes], { type: file.mimeType });\n          blobs.set(binding.path, blob);\n        }\n        const url = URL.createObjectURL(blob);\n        urls.push(url);\n        values.set(name, { name: file.name, blob, url });\n        updates.push({ name, revision: 1, state: "ready", value: { type: "file", ...file } });\n      }\n      globalThis.addEventListener("pagehide", (event) => {\n        // A persisted pagehide can restore this same document and its subscriptions.\n        if (event.persisted) return;\n        for (const url of urls) URL.revokeObjectURL(url);\n        urls.length = 0;\n      });\n    }\n    if (mockElement != null || fileElement != null) connectorGlobals.visualizationData = { updates };\n    connectorGlobals.visualization = {\n      get bindings() {\n        return bindings;\n      },\n      /** @param {string} name @param {(value: unknown) => void} callback */\n      onData(name, callback) {\n        if (typeof callback !== "function") {\n          throw new TypeError("onData requires a callback");\n        }\n        try {\n          callback(values.get(name));\n        } catch (error) {\n          // oxlint-disable-next-line no-console -- Keep authored callback failures local.\n          console.error("Live visualization data callback failed", error);\n        }\n        // A static preview delivers the current value once per subscription.\n        return () => {};\n      },\n    };\n  }\n  const syncTheme = () => {\n    const theme = mediaQuery.matches ? "dark" : "light";\n    root.dataset.theme = theme;\n    globalThis.openai = {\n      ...globalThis.openai,\n      ...connectorGlobals,\n      openExternal,\n      sendFollowUpMessage,\n      setWidgetState,\n      theme,\n      visualizationStyleVariables: {},\n      visualizationTheme: theme,\n      widgetState: state,\n      statePersistence,\n      stateModelContext: "none",\n    };\n    globalThis.dispatchEvent(\n      new CustomEvent("openai:set_globals", {\n        detail: { globals: globalThis.openai },\n      }),\n    );\n  };\n  const sendHeight = () => {\n    postToHost("height", {\n      height: Math.ceil(\n        Math.max(\n          document.body.scrollHeight,\n          document.body.getBoundingClientRect().height,\n        ),\n      ),\n    });\n  };\n\n  globalThis.addEventListener(\n    "message",\n    (event) => {\n      const data = apply(getMessageData, event, []);\n      const ports = apply(getMessagePorts, event, []);\n      const source = apply(getMessageSource, event, []);\n      if (\n        hostPort != null ||\n        source !== parentWindow ||\n        typeof data !== "object" ||\n        data?.type !== "codex-visualization-initialize" ||\n        !isArray(ports) ||\n        ports.length !== 1\n      ) {\n        return;\n      }\n      apply(stopMessagePropagation, event, []);\n      const nextHostPort = ports[0];\n      try {\n        apply(addHostMessageListener, nextHostPort, [\n          "message",\n          (event) => {\n            const data = apply(getMessageData, event, []);\n            if (typeof data === "object" && data?.type === "measure") {\n              sendHeight();\n            } else if (\n              typeof data === "object" &&\n              data?.type === "widget-state-result"\n            ) {\n              /** @type {unknown} */\n              const id = data.id;\n              if (typeof id !== "number") {\n                return;\n              }\n              const pending = pendingStateWrites.get(id);\n              if (pending != null) {\n                pendingStateWrites.delete(id);\n                globalThis.clearTimeout(pending.timeout);\n                if (data.ok === true) {\n                  pending.resolve();\n                } else {\n                  pending.reject(persistenceError());\n                }\n              }\n            }\n          },\n        ]);\n        apply(startHostPort, nextHostPort, []);\n      } catch {\n        return;\n      }\n      hostPort = nextHostPort;\n      for (const [id, { serializedState }] of pendingStateWrites) {\n        postToHost("widget-state-write", { id, state: serializedState });\n      }\n      sendHeight();\n    },\n    { capture: true },\n  );\n  document.currentScript?.remove();\n  mediaQuery.addEventListener("change", syncTheme);\n  globalThis.addEventListener("click", (event) => {\n    if (event.defaultPrevented) {\n      return;\n    }\n    let element = null;\n    if (event.target instanceof globalThis.Element) {\n      element = event.target;\n    } else if (event.target instanceof globalThis.Node) {\n      element = event.target.parentElement;\n    }\n    const link = element?.closest("a[href]");\n    const href = link?.getAttribute("href");\n    if (href == null) {\n      return;\n    }\n    if (href.startsWith("#")) {\n      let id;\n      try {\n        id = decodeURIComponent(href.slice(1));\n      } catch {\n        return;\n      }\n      const target = id.length === 0 ? root : document.getElementById(id);\n      if (\n        target == null ||\n        globalThis.navigator.userActivation?.isActive !== true\n      ) {\n        return;\n      }\n      event.preventDefault();\n      postToHost("scroll-to", {\n        top: target.getBoundingClientRect().top + globalThis.scrollY,\n      });\n      return;\n    }\n    event.preventDefault();\n    openExternal({ href });\n  });\n  new ResizeObserver(sendHeight).observe(document.body);\n  syncTheme();\n})();\n'.replaceAll("</script","<\\/script")}<\/script>
${(0,o.getVisualizationSandboxHtml)(n,{lockDocumentOverflow:!1,reportToHost:!1,styles:`${r}
html>body{padding:0}`})}
</body>
</html>
`,u=`<iframe id="codex-visualization" sandbox="allow-scripts" scrolling="no" referrerpolicy="no-referrer" title="${d(i)}" data-srcdoc="${d(p)}"></iframe>`;return`<!doctype html>
<html lang="${d(t)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="${l}">
<title>${d(i)}</title>
<style>:root{color-scheme:light dark;background:${a.a}}html,body{margin:0}body{box-sizing:border-box;padding:1rem;background:inherit}iframe{display:block;width:100%;max-width:736px;height:calc(100vh - 2rem);margin:0 auto;border:0}</style>
${null==c?"":`<style>${r}
:root.visualization-share-root {
  --background: light-dark(#fdfdfd, #141414);
  --foreground: light-dark(#222, #ececee);
  --share-surface: light-dark(#fff, #181818);
  --share-outline: light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 12%));
  --share-shadow-near: light-dark(#00000003, transparent);
  --share-shadow-far: light-dark(#00000020, transparent);
  --share-divider: light-dark(#efeff1, #343437);
  --share-credit: light-dark(#77777e, #a1a1a8);
  --share-link: light-dark(#006cde, #83c3ff);
  --share-control: light-dark(#65656c, #b5b5bc);
  --share-description: light-dark(#717178, #b5b5bc);
  --share-context: light-dark(#919197, #a1a1a8);
  --share-icon: light-dark(#83838a, #a1a1a8);
  --share-icon-border: light-dark(#e8e8ec, #3a3a3e);
  --share-chevron: light-dark(#a0a0a6, #94949b);
  --share-focus: light-dark(#5291f7, #83c3ff);
  --font-sans: system-ui, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.visualization-share-page {
  min-block-size: 100svh;
  padding: 0;
  color: var(--foreground);
  line-height: normal;
}
.visualization-share-brand {
  position: absolute;
  inset-block-start: 28px;
  inset-inline-start: 28px;
  line-height: 0;
}
.visualization-share-brand a {
  display: block;
  color: inherit;
}
.visualization-share-wordmark {
  display: block;
  inline-size: 86.25px;
  block-size: auto;
}
.visualization-share-main {
  display: grid;
  place-items: center;
  min-block-size: 100svh;
  padding: 88px 24px;
}
.visualization-share-object {
  visibility: hidden;
  inline-size: min(100%, 780px);
  min-inline-size: 0;
  perspective: 1600px;
}
.visualization-share-ready .visualization-share-object {
  visibility: visible;
}
.visualization-share-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  transform-style: preserve-3d;
  transition: transform 0.65s cubic-bezier(0.22, 0.75, 0.22, 1);
}
.visualization-share-flipped {
  transform: rotateY(180deg);
}
.visualization-share-face {
  position: relative;
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  min-inline-size: 0;
  overflow: hidden;
  border: 0;
  border-radius: 36px;
  background: var(--share-surface);
  box-shadow:
    0 0 0 0.5px var(--share-outline),
    0 2px 5px var(--share-shadow-near),
    0 18px 60px -25px var(--share-shadow-far);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.visualization-share-sources[hidden] {
  display: none;
}
.visualization-share-sources {
  transform: rotateY(180deg);
}
.visualization-share-content {
  flex: 1;
  padding: 36px;
}
.visualization-share-page iframe {
  display: block;
  inline-size: 100%;
  max-inline-size: none;
  margin: 0;
  border: 0;
}
.visualization-share-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  padding: 16px 8px 0;
}
.visualization-share-attribution {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 5px;
  min-inline-size: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--share-credit);
  font-size: 13px;
  line-height: 1.5;
}
.visualization-share-growth,
.visualization-share-source-link {
  color: var(--share-link);
  text-decoration: none;
}
.visualization-share-growth {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}
.visualization-share-logo {
  display: block;
  flex-shrink: 0;
  inline-size: 20px;
  block-size: 20px;
}
.visualization-share-growth:hover,
.visualization-share-source-link:hover {
  text-decoration: underline solid;
}
.visualization-share-controls {
  display: grid;
  margin-inline-start: auto;
}
.visualization-share-toggle {
  grid-area: 1 / 1;
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 0;
  border: 0;
  background: none;
  color: var(--share-control);
  font: inherit;
  font-size: 14px;
  line-height: normal;
  white-space: nowrap;
  cursor: var(--cursor-interaction, pointer);
}
.visualization-share-toggle:hover {
  color: var(--foreground);
}
.visualization-share-toggle[hidden] {
  display: inline-flex;
  visibility: hidden;
}
.visualization-share-toggle:focus-visible,
.visualization-share-source summary:focus-visible,
.visualization-share-source-link:focus-visible,
.visualization-share-brand a:focus-visible,
.visualization-share-growth:focus-visible {
  outline: 2px solid var(--share-focus);
  outline-offset: 5px;
  border-radius: 3px;
}
.visualization-share-growth:focus-visible {
  outline-offset: 4px;
}
.visualization-share-icon {
  display: block;
  flex-shrink: 0;
  inline-size: 18px;
  block-size: 18px;
}
.visualization-share-sources-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 20px;
}
.visualization-share-sources h2 {
  margin: 0;
  color: var(--foreground);
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: -0.65px;
  font-weight: 600;
}
.visualization-share-source {
  border-block-start: 1px solid var(--share-divider);
  padding-block: 14px;
}
.visualization-share-source:last-child {
  padding-block-end: 0;
}
.visualization-share-source summary {
  display: flex;
  align-items: center;
  gap: 12px;
  list-style: none;
  cursor: var(--cursor-interaction, pointer);
}
.visualization-share-source summary::-webkit-details-marker {
  display: none;
}
.visualization-share-source-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  inline-size: 32px;
  block-size: 32px;
  border: 1px solid var(--share-icon-border);
  border-radius: 7px;
  color: var(--share-icon);
}
.visualization-share-source-icon .visualization-share-icon {
  inline-size: 19px;
  block-size: 19px;
}
.visualization-share-chevron {
  flex-shrink: 0;
  inline-size: 16px;
  block-size: 16px;
  margin-inline-start: auto;
  color: var(--share-chevron);
  transition: transform 0.2s;
}
.visualization-share-source[open] .visualization-share-chevron {
  transform: rotate(90deg);
}
.visualization-share-source-heading {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}
.visualization-share-source-title {
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
}
.visualization-share-source-context {
  margin-block-start: 3px;
  color: var(--share-context);
  font-size: 12px;
}
.visualization-share-source-description,
.visualization-share-source-link {
  margin: 12px 0 0 44px;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.visualization-share-source-description {
  color: var(--share-description);
  white-space: pre-line;
}
.visualization-share-source-link {
  display: inline-block;
}
@media (width <= 540px) {
  .visualization-share-main {
    padding: 80px 16px 48px;
  }
  .visualization-share-brand {
    inset-block-start: 24px;
    inset-inline-start: 24px;
  }
  .visualization-share-wordmark {
    inline-size: 78px;
  }
  .visualization-share-face {
    border-radius: 30px;
  }
  .visualization-share-sources h2 {
    font-size: 20px;
  }
  .visualization-share-source-title {
    font-size: 13px;
  }
  .visualization-share-footer {
    padding: 14px 4px 0;
    gap: 8px 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .visualization-share-card,
  .visualization-share-chevron {
    transition: none;
  }
}
</style>`}
</head>
<body>
${u}
${null==c?"":`<script type="application/json" id="visualization-share">${JSON.stringify(c).replaceAll("<","\\u003c")}<\/script>
<script>${'(() => {\n  const configuration = document.getElementById("visualization-share");\n  const frame = document.getElementById("codex-visualization");\n  if (configuration == null || !(frame instanceof HTMLIFrameElement)) {\n    return;\n  }\n  let config;\n  try {\n    config = JSON.parse(configuration.textContent);\n  } catch {\n    return;\n  }\n  const metadata = config.metadata ?? {};\n  const labels = config.labels;\n  const element = (tag, className, text) => {\n    const node = document.createElement(tag);\n    if (className) {\n      node.className = className;\n    }\n    if (typeof text === "string") {\n      node.textContent = text;\n    }\n    return node;\n  };\n  const link = (href, text, className) => {\n    const node = element("a", className, text);\n    node.href = href;\n    node.target = "_blank";\n    node.rel = "noopener noreferrer";\n    return node;\n  };\n  const safeUrl = (value) => {\n    try {\n      const url = new URL(value);\n      return url.protocol === "https:" && !url.username && !url.password\n        ? url.href\n        : null;\n    } catch {\n      return null;\n    }\n  };\n\n  // Bundle the reviewed vectors so portable Python/Work exports need no icon\n  // package or network request. Geometry comes from these canonical assets:\n  // codex/codex-apps/webview/src/icons/chatgpt-wordmark.svg\n  // plugins/visualize/assets/visualize.svg and visualize-dark.svg (theme-aware paint)\n  // @oai/icons 0.8.65: {sources,arrow-curvedpath-left-md,table,file-code-square,document}-light-20\n  // @oai/icons/chevron-right-sm-light-16\n  const icons = {\n    wordmark:\n      \'<svg\\n  width="357"\\n  height="62"\\n  viewBox="0 0 357 62"\\n  fill="none"\\n  role="img"\\n  focusable="false"\\n  xmlns="http://www.w3.org/2000/svg"\\n>\\n  <title>ChatGPT</title>\\n  <path\\n    d="M30.8694 50.7428C19.9894 50.7428 12.4244 42.4978 12.4244 31.1078C12.4244 19.7178 19.9894 11.4728 30.6994 11.4728C38.5194 11.4728 44.5544 16.0628 46.3394 21.6728H58.4944C56.3694 9.43281 44.8944 0.507812 30.5294 0.507812C13.2744 0.507812 0.609375 14.1928 0.609375 31.1078C0.609375 48.0228 12.9344 61.7078 30.6144 61.7078C45.2344 61.7078 56.4544 52.9528 58.7494 40.5428H46.6794C44.6394 46.2378 38.6894 50.7428 30.8694 50.7428Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M88.586 17.5094C82.976 17.5094 78.556 19.9744 76.091 23.3744V1.35938H65.041V60.8594H76.091V37.9944C76.091 31.3644 79.661 27.0294 85.441 27.0294C90.711 27.0294 93.686 31.1094 93.686 36.8044V60.8594H104.736V35.0194C104.736 24.4794 98.276 17.5094 88.586 17.5094Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M150.04 33.1478C150.04 23.4578 143.41 17.5078 131.17 17.5078C121.14 17.5078 113.15 23.1178 111.79 31.2778H122.925C123.775 28.4728 126.835 26.2628 131.085 26.2628C136.61 26.2628 139.245 29.1528 139.245 34.1678V34.4228L128.45 35.3578C117.145 36.2928 110.855 40.8828 110.855 49.5528C110.855 56.8628 117.145 61.7078 125.9 61.7078C131.765 61.7078 137.46 59.4128 139.84 55.5878C139.84 57.4578 140.01 59.1578 140.35 60.8578H150.635C150.21 58.1378 150.04 54.9928 150.04 51.3378V33.1478ZM139.245 43.2628C139.245 48.2778 135.505 53.3778 127.94 53.3778C123.86 53.3778 121.65 51.4228 121.65 48.5328C121.65 45.3878 123.775 43.4328 128.535 43.0078L139.245 42.0728V43.2628Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M173.245 4.58984H162.195V18.3598H153.355V27.2848H162.195V48.1948C162.195 56.2698 166.36 60.8598 175.285 60.8598H184.125V51.6798H178.515C174.775 51.6798 173.245 50.4048 173.245 46.9198V27.2848H184.125V18.3598H173.245V4.58984Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M239.033 29.0678H219.993V38.5878H236.228C235.123 46.4928 227.728 51.2528 219.483 51.2528C207.583 51.2528 200.613 42.4978 200.613 31.1078C200.613 19.7178 208.433 11.3878 219.143 11.3878C226.453 11.3878 232.403 15.6378 233.933 20.3978H246.088C243.793 8.58281 232.913 0.507812 218.973 0.507812C201.803 0.507812 189.053 14.3628 189.053 31.1928C189.053 48.0228 200.783 61.7078 218.293 61.7078C226.283 61.7078 233.508 58.1378 236.738 53.2928V60.8578H246.598V36.6328C246.598 31.7878 243.878 29.0678 239.033 29.0678Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M281.703 1.35938H255.354V60.8594H266.573V38.5044H281.789C293.519 38.5044 301.849 31.6194 301.849 20.0594C301.849 8.49937 293.518 1.35938 281.703 1.35938ZM280.939 28.6444H266.573V11.5594H280.939C286.719 11.5594 290.458 14.8744 290.458 20.0594C290.458 25.2444 286.719 28.6444 280.939 28.6444Z"\\n    fill="currentColor"\\n  />\\n  <path\\n    d="M304.652 1.35938V11.5594H324.967V60.8594H336.187V11.5594H356.587V1.35938H304.652Z"\\n    fill="currentColor"\\n  />\\n</svg>\',\n    visualize:\n      \'<svg\\n  xmlns="http://www.w3.org/2000/svg"\\n  width="24"\\n  height="24"\\n  fill="none"\\n  viewBox="0 0 24 24"\\n>\\n  <path\\n    fill="light-dark(white, #EBEBEB)"\\n    d="M6.95984 4H17.0402C17.706 3.99999 18.2656 3.99997 18.7234 4.03738C19.2022 4.0765 19.6571 4.16144 20.089 4.38148C20.7475 4.71703 21.283 5.25247 21.6185 5.91103C21.8386 6.34289 21.9235 6.79785 21.9626 7.27657C22 7.73444 22 8.29396 22 8.95982V15.0402C22 15.706 22 16.2656 21.9626 16.7234C21.9235 17.2021 21.8386 17.6571 21.6185 18.089C21.283 18.7475 20.7475 19.283 20.089 19.6185C19.6571 19.8386 19.2021 19.9235 18.7234 19.9626C18.2656 20 17.706 20 17.0402 20H6.95982C6.29396 20 5.73444 20 5.27657 19.9626C4.79785 19.9235 4.34289 19.8386 3.91103 19.6185C3.25247 19.283 2.71704 18.7475 2.38148 18.089C2.16144 17.6571 2.0765 17.2021 2.03738 16.7234C1.99997 16.2656 1.99999 15.706 2 15.0402V8.95984C1.99999 8.29397 1.99997 7.73445 2.03738 7.27657C2.0765 6.79785 2.16144 6.34289 2.38148 5.91103C2.71704 5.25247 3.25247 4.71704 3.91103 4.38148C4.34289 4.16144 4.79785 4.0765 5.27657 4.03738C5.73445 3.99997 6.29397 3.99999 6.95984 4Z"\\n  />\\n  <rect x="3" y="5" width="18" height="14" rx="2.5" fill="light-dark(#2E9EFF, #68C4FF)" />\\n  <path\\n    fill="#F5F5F5"\\n    d="M11.2952 7.93832C11.5345 7.28007 12.4655 7.28007 12.7048 7.93832L13.4804 10.0711C13.5562 10.2796 13.7204 10.4438 13.9289 10.5196L16.0617 11.2952C16.7199 11.5345 16.7199 12.4655 16.0617 12.7048L13.9289 13.4804C13.7204 13.5562 13.5562 13.7204 13.4804 13.9289L12.7048 16.0617C12.4655 16.7199 11.5345 16.7199 11.2952 16.0617L10.5196 13.9289C10.4438 13.7204 10.2796 13.5562 10.0711 13.4804L7.93832 12.7048C7.28007 12.4655 7.28007 11.5345 7.93832 11.2952L10.0711 10.5196C10.2796 10.4438 10.4438 10.2796 10.5196 10.0711L11.2952 7.93832Z"\\n  />\\n</svg>\',\n    sources:\n      \'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.4365 2.25244C16.2993 2.25257 17.8104 3.76268 17.8105 5.62549C17.8105 7.48845 16.2995 8.99938 14.4365 8.99951C12.8756 8.99936 11.5624 7.9384 11.1777 6.49854H8.75C8.33552 6.49867 8.08566 6.70063 8.00391 6.88428C7.93983 7.02847 7.8974 7.36151 8.37109 7.84424L12.5283 11.1704L12.5537 11.1958C13.3113 11.9535 13.5635 12.8643 13.2119 13.6558C12.8769 14.4089 12.0854 14.8313 11.251 14.8315H8.86914C8.66988 16.5047 7.24717 17.8032 5.52051 17.8032C3.65778 17.803 2.14772 16.2919 2.14746 14.4292C2.14764 12.5664 3.65773 11.0563 5.52051 11.0562C7.06179 11.0562 8.36147 12.0895 8.76465 13.5015H11.251C11.6654 13.5012 11.9155 13.2984 11.9971 13.1147C12.0609 12.9704 12.1026 12.6381 11.6309 12.1567L7.50195 8.85205L7.47266 8.82959L7.44727 8.80322C6.6895 8.04545 6.4373 7.1358 6.78906 6.34424C7.12406 5.59088 7.9154 5.16859 8.75 5.16846H11.0957C11.319 3.52195 12.7288 2.2526 14.4365 2.25244ZM5.52051 12.3862C4.39226 12.3864 3.47771 13.301 3.47754 14.4292C3.4778 15.5574 4.39232 16.473 5.52051 16.4731C6.64885 16.4731 7.56419 15.5575 7.56445 14.4292C7.56428 13.3008 6.6489 12.3862 5.52051 12.3862ZM14.4365 3.58252C13.3083 3.5827 12.3937 4.49724 12.3936 5.62549C12.3936 6.75388 13.3082 7.66926 14.4365 7.66943C15.5649 7.6693 16.4805 6.75391 16.4805 5.62549C16.4803 4.49722 15.5648 3.58265 14.4365 3.58252Z" fill="currentColor"/></svg>\',\n    back: \'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M14.9587 6.00146C15.3258 6.00168 15.6237 6.29937 15.6237 6.6665V9.16064C15.6237 9.81272 15.4102 10.4093 14.9753 10.8442C14.5404 11.2791 13.9437 11.4926 13.2917 11.4927H6.59834L7.96944 12.8628C8.22914 13.1225 8.22914 13.5445 7.96944 13.8042C7.70971 14.0635 7.28761 14.0638 7.02803 13.8042L4.88252 11.6577C4.42772 11.2029 4.42794 10.4643 4.88252 10.0093L7.02803 7.86279C7.28772 7.60311 7.70974 7.60313 7.96944 7.86279C8.22914 8.12249 8.22914 8.5445 7.96944 8.8042L6.61006 10.1626H13.2917C13.6528 10.1625 13.89 10.0487 14.0349 9.90381C14.1797 9.75883 14.2937 9.52183 14.2937 9.16064V6.6665C14.2937 6.29923 14.5914 6.00146 14.9587 6.00146Z" fill="currentColor"/></svg>\',\n    table:\n      \'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.167 3.08496C16.8227 3.08514 18.1649 4.42733 18.165 6.08301V13.917C18.1649 15.5727 16.8227 16.9149 15.167 16.915H4.83301C3.17733 16.9149 1.83514 15.5727 1.83496 13.917V6.08301C1.83514 4.42733 3.17733 3.08514 4.83301 3.08496H15.167ZM10.665 15.585H15.167C16.0881 15.5848 16.8348 14.8381 16.835 13.917V8.99805H10.665V15.585ZM3.16504 13.917C3.16522 14.8381 3.91187 15.5848 4.83301 15.585H9.33496V8.99805H3.16504V13.917ZM4.83301 4.41504C3.91187 4.41521 3.16521 5.16187 3.16504 6.08301V7.66797H16.835V6.08301C16.8348 5.16187 16.0881 4.41522 15.167 4.41504H4.83301Z" fill="currentColor"/></svg>\',\n    code: \'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6.20166 7.42334C6.42204 7.12958 6.83951 7.07018 7.1333 7.29053C7.4269 7.51094 7.48641 7.92844 7.26611 8.22217L5.93213 9.99951L7.26611 11.7788C7.486 12.0726 7.42684 12.4892 7.1333 12.7095C6.83956 12.9298 6.42207 12.8703 6.20166 12.5767L4.56885 10.3989C4.39171 10.1626 4.39169 9.83744 4.56885 9.60107L6.20166 7.42334Z" fill="currentColor"/> <path d="M10.4946 7.5249C10.6591 7.19696 11.058 7.06395 11.3862 7.22803C11.7144 7.39235 11.8481 7.79225 11.6841 8.12061L9.50635 12.4751C9.34207 12.8033 8.94212 12.9359 8.61377 12.772C8.28569 12.6076 8.15292 12.2087 8.31689 11.8804L10.4946 7.5249Z" fill="currentColor"/> <path d="M12.8667 7.29053C13.1605 7.07024 13.578 7.12967 13.7983 7.42334L15.4312 9.60107C15.6082 9.83745 15.6083 10.1626 15.4312 10.3989L13.7983 12.5767C13.578 12.8703 13.1605 12.9296 12.8667 12.7095C12.5732 12.4892 12.5139 12.0725 12.7339 11.7788L14.0669 9.99951L12.7339 8.22217C12.5136 7.9284 12.573 7.51092 12.8667 7.29053Z" fill="currentColor"/> <path fill-rule="evenodd" clip-rule="evenodd" d="M14.7495 2.25146C16.4053 2.25146 17.7484 3.59373 17.7485 5.24951V14.7495C17.7485 16.4054 16.4054 17.7485 14.7495 17.7485H5.24951C3.59373 17.7484 2.25146 16.4053 2.25146 14.7495V5.24951C2.25164 3.59384 3.59384 2.25164 5.24951 2.25146H14.7495ZM5.24951 3.58154C4.32837 3.58172 3.58172 4.32838 3.58154 5.24951V14.7495C3.58154 15.6708 4.32827 16.4183 5.24951 16.4185H14.7495C15.6709 16.4185 16.4185 15.6709 16.4185 14.7495V5.24951C16.4183 4.32827 15.6708 3.58154 14.7495 3.58154H5.24951Z" fill="currentColor"/></svg>\',\n    document:\n      \'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.8809 2.25171C12.7202 2.25171 13.5256 2.585 14.1191 3.17847L15.9883 5.04761C16.5817 5.64115 16.915 6.44654 16.915 7.28589V14.5837C16.9149 16.3316 15.4979 17.7488 13.75 17.7488H6.25C4.50213 17.7488 3.08514 16.3316 3.08496 14.5837V5.41675C3.08496 3.66877 4.50202 2.25171 6.25 2.25171H11.8809ZM6.25 3.58179C5.23656 3.58179 4.41504 4.40331 4.41504 5.41675V14.5837C4.41521 15.597 5.23667 16.4187 6.25 16.4187H13.75C14.7633 16.4187 15.5848 15.597 15.585 14.5837V8.58179H13.334C12.0463 8.58179 11.0021 7.53739 11.002 6.24976V3.58179H6.25ZM12.332 6.24976C12.3322 6.80285 12.7809 7.25171 13.334 7.25171H15.583C15.5742 6.77746 15.3838 6.32408 15.0479 5.98804L13.1787 4.1189C12.9432 3.8834 12.6496 3.71992 12.332 3.6394V6.24976Z" fill="currentColor"/></svg>\',\n    chevron:\n      \'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.29561 10.2954C6.09064 10.5003 6.09075 10.8325 6.29561 11.0376C6.50064 11.2426 6.83278 11.2426 7.0378 11.0376L9.46847 8.60689C9.80367 8.27169 9.80367 7.72823 9.46847 7.39303L7.0378 4.96236C6.83278 4.75734 6.50064 4.75734 6.29561 4.96236C6.09059 5.16739 6.09059 5.49952 6.29561 5.70455L8.59054 7.99947L6.29561 10.2954Z" fill="currentColor"/></svg>\',\n  };\n  const icon = (svg, className = "visualization-share-icon") => {\n    const node = document.importNode(\n      new DOMParser().parseFromString(svg, "image/svg+xml").documentElement,\n      true,\n    );\n    node.setAttribute("class", className);\n    node.setAttribute("aria-hidden", "true");\n    node.setAttribute("focusable", "false");\n    return node;\n  };\n\n  document.documentElement.classList.add("visualization-share-root");\n  document.body.classList.add("visualization-share-page");\n  const brand = element("header", "visualization-share-brand");\n  const home = link("https://chatgpt.com/");\n  home.setAttribute("aria-label", "ChatGPT");\n  home.append(icon(icons.wordmark, "visualization-share-wordmark"));\n  brand.append(home);\n  const main = element("main", "visualization-share-main");\n  const article = element("article", "visualization-share-object");\n  const card = element("div", "visualization-share-card");\n  const chart = element(\n    "section",\n    "visualization-share-face visualization-share-chart",\n  );\n  chart.id = "visualization-share-chart";\n  chart.setAttribute("aria-label", frame.title);\n  chart.setAttribute("aria-hidden", "false");\n  const content = element("div", "visualization-share-content");\n  content.append(frame);\n  chart.append(content);\n  card.append(chart);\n\n  const footer = element("footer", "visualization-share-footer");\n  const attribution = element("p", "visualization-share-attribution");\n  const authorName =\n    typeof metadata.authorName === "string" ? metadata.authorName : "";\n  const attributionLabel = authorName ? labels.madeBy : labels.madeWith;\n  for (const part of attributionLabel.split(/(\\{visualize\\})/)) {\n    if (part === "{visualize}") {\n      const growth = link(\n        "https://chatgpt.com/?prompt=%40visualize",\n        "Visualize",\n        "visualization-share-growth",\n      );\n      growth.prepend(icon(icons.visualize, "visualization-share-logo"));\n      attribution.append(growth);\n    } else if (part.trim()) {\n      attribution.append(\n        element(\n          "span",\n          "",\n          part.replaceAll("{author}", () => authorName).trim(),\n        ),\n      );\n    }\n  }\n  footer.append(attribution);\n  const sources = Array.isArray(metadata.sources) ? metadata.sources : [];\n  if (sources.length > 0) {\n    const panel = element(\n      "section",\n      "visualization-share-face visualization-share-sources",\n    );\n    panel.id = "visualization-share-sources";\n    panel.inert = true;\n    panel.hidden = true;\n    panel.setAttribute("aria-hidden", "true");\n    const sourceContent = element("div", "visualization-share-content");\n    const header = element("div", "visualization-share-sources-header");\n    const heading = element("h2", "", labels.sources);\n    heading.id = "visualization-share-sources-heading";\n    panel.setAttribute("aria-labelledby", heading.id);\n    header.append(heading);\n    sourceContent.append(header);\n    for (const source of sources) {\n      if (typeof source.title !== "string") {\n        continue;\n      }\n      const row = element("details", "visualization-share-source");\n      const summary = element("summary");\n      const documentIcon = element("span", "visualization-share-source-icon");\n      const type =\n        typeof source.type === "string" ? source.type.toLowerCase() : "";\n      let sourceIcon = icons.document;\n      if (type === "saved query" || type === "query" || type === "code") {\n        sourceIcon = icons.code;\n      } else if (\n        type === "dataset" ||\n        type === "table" ||\n        type === "spreadsheet"\n      ) {\n        sourceIcon = icons.table;\n      }\n      documentIcon.append(icon(sourceIcon));\n      const text = element("span", "visualization-share-source-heading");\n      text.append(\n        element("span", "visualization-share-source-title", source.title),\n      );\n      const context = [source.provider, source.type, source.date]\n        .filter((value) => typeof value === "string" && value.length > 0)\n        .join(" · ");\n      if (context) {\n        text.append(\n          element("span", "visualization-share-source-context", context),\n        );\n      }\n      summary.append(\n        documentIcon,\n        text,\n        icon(icons.chevron, "visualization-share-chevron"),\n      );\n      row.append(summary);\n      if (typeof source.description === "string" && source.description) {\n        row.append(\n          element(\n            "p",\n            "visualization-share-source-description",\n            source.description,\n          ),\n        );\n      }\n      const url = safeUrl(source.url);\n      if (url != null) {\n        row.append(\n          link(url, labels.openSource, "visualization-share-source-link"),\n        );\n      }\n      sourceContent.append(row);\n    }\n    panel.append(sourceContent);\n    card.append(panel);\n    const showSources = element(\n      "button",\n      "visualization-share-toggle",\n      labels.sources,\n    );\n    showSources.type = "button";\n    showSources.setAttribute("aria-controls", panel.id);\n    showSources.setAttribute("aria-expanded", "false");\n    showSources.prepend(icon(icons.sources));\n    const showChart = element(\n      "button",\n      "visualization-share-toggle",\n      labels.backToChart,\n    );\n    showChart.type = "button";\n    showChart.setAttribute("aria-controls", chart.id);\n    showChart.hidden = true;\n    showChart.prepend(icon(icons.back));\n    const hideInactiveSources = () => {\n      if (!chart.inert && card.getAnimations().length === 0) {\n        panel.hidden = true;\n      }\n    };\n    const flip = (show) => {\n      // Keep the iframe mounted and the outgoing sources at their full height\n      // until the flip finishes. Hidden sources must not size the chart.\n      if (show) {\n        panel.hidden = false;\n      }\n      card.classList.toggle("visualization-share-flipped", show);\n      showSources.hidden = show;\n      showChart.hidden = !show;\n      chart.inert = show;\n      panel.inert = !show;\n      chart.setAttribute("aria-hidden", String(show));\n      panel.setAttribute("aria-hidden", String(!show));\n      showSources.setAttribute("aria-expanded", String(show));\n      (show ? showChart : showSources).focus({ preventScroll: true });\n      hideInactiveSources();\n    };\n    for (const eventType of ["transitionend", "transitioncancel"]) {\n      card.addEventListener(eventType, (event) => {\n        if (event.target === card) {\n          hideInactiveSources();\n        }\n      });\n    }\n    showSources.addEventListener("click", () => flip(true));\n    showChart.addEventListener("click", () => flip(false));\n    document.addEventListener("keydown", (event) => {\n      if (event.key === "Escape" && chart.inert) {\n        event.preventDefault();\n        flip(false);\n      }\n    });\n    const controls = element("div", "visualization-share-controls");\n    controls.append(showSources, showChart);\n    footer.append(controls);\n  }\n  article.append(card, footer);\n  main.append(article);\n  document.body.prepend(brand, main);\n})();\n'.replaceAll("</script","<\\/script")}<\/script>`}
<script>${'(() => {\n  const frame = document.getElementById("codex-visualization");\n  if (!(frame instanceof HTMLIFrameElement)) {\n    return;\n  }\n  const isShare = document.documentElement.classList.contains(\n    "visualization-share-root",\n  );\n  let viewportHeight = globalThis.innerHeight;\n  let sizeFingerprint = null;\n  let sizeWriteTimeout;\n  let lastSize = null;\n  let pendingSize = null;\n  const storageKey = `codex:visualization-widget-state-v2:${JSON.stringify([\n    globalThis.location.pathname,\n    globalThis.location.search,\n  ])}`;\n  const sizeStorageKey = `${storageKey}:share-size-v1`;\n  const parseState = (serializedState) => {\n    if (\n      typeof serializedState !== "string" ||\n      new TextEncoder().encode(serializedState).length > 16 * 1024\n    ) {\n      throw new TypeError(\n        "Widget state must be a JSON object of at most 16 KiB",\n      );\n    }\n    /** @type {unknown} */\n    const state = JSON.parse(serializedState);\n    if (\n      state == null ||\n      typeof state !== "object" ||\n      Array.isArray(state) ||\n      ("imageIds" in state &&\n        (!Array.isArray(state.imageIds) || state.imageIds.length > 0))\n    ) {\n      throw new TypeError("Widget state must be a JSON object");\n    }\n    const storedState = { modelContent: null, privateContent: null, ...state };\n    const canonicalState = JSON.stringify(\n      storedState,\n      (_key, /** @type {unknown} */ value) => {\n        if (typeof value === "number" && !Number.isFinite(value)) {\n          throw new TypeError("Widget state must contain finite numbers");\n        }\n        return value;\n      },\n    );\n    if (new TextEncoder().encode(canonicalState).length > 16 * 1024) {\n      throw new TypeError(\n        "Widget state must be a JSON object of at most 16 KiB",\n      );\n    }\n    return storedState;\n  };\n  let storage = null;\n  let state = null;\n  try {\n    const localStorage = globalThis.localStorage;\n    const probeKey = `${storageKey}:probe`;\n    localStorage.setItem(probeKey, "1");\n    localStorage.removeItem(probeKey);\n    storage = localStorage;\n    const savedState = storage.getItem(storageKey);\n    if (savedState != null) {\n      try {\n        state = parseState(savedState);\n      } catch {\n        // Invalid saved state does not disable future writes.\n      }\n    }\n  } catch {\n    storage = null;\n  }\n  const persistSize = () => {\n    globalThis.clearTimeout(sizeWriteTimeout);\n    if (pendingSize == null) {\n      return;\n    }\n    try {\n      storage?.setItem(sizeStorageKey, pendingSize);\n    } catch {\n      // A denied or full cache must not affect the visualization.\n    }\n    pendingSize = null;\n  };\n  if (isShare) {\n    globalThis.addEventListener("pagehide", persistSize);\n  }\n  const initialGlobals = {\n    widgetState: state,\n    statePersistence: storage == null ? "none" : "local",\n  };\n\n  const channel = new MessageChannel();\n  channel.port1.addEventListener("message", (event) => {\n    const data = event.data;\n    if (typeof data !== "object" || data == null) {\n      return;\n    }\n    if (data.type === "widget-state-write") {\n      if (!Number.isSafeInteger(data.id) || data.id <= 0) {\n        return;\n      }\n      let ok = false;\n      try {\n        if (storage != null) {\n          const state = parseState(data.state);\n          storage.setItem(storageKey, JSON.stringify(state));\n          ok = true;\n        }\n      } catch {\n        // Storage denial, quota limits, and invalid state return a failed receipt.\n      }\n      channel.port1.postMessage({\n        type: "widget-state-result",\n        id: data.id,\n        ok,\n      });\n      return;\n    }\n    if (data.type === "height") {\n      const height = data.height;\n      if (\n        typeof height !== "number" ||\n        !Number.isFinite(height) ||\n        height < 0\n      ) {\n        return;\n      }\n      if (height <= 10_000) {\n        const width = isShare && storage != null ? frame.clientWidth : null;\n        frame.style.height = Math.ceil(height) + "px";\n        if (isShare && storage != null) {\n          const size = JSON.stringify({\n            fingerprint: sizeFingerprint,\n            width,\n            viewportHeight: globalThis.innerHeight,\n            dark: globalThis.matchMedia("(prefers-color-scheme: dark)").matches,\n            scale: globalThis.devicePixelRatio,\n            height: Math.ceil(height),\n          });\n          if (size !== lastSize) {\n            lastSize = size;\n            pendingSize = size;\n            globalThis.clearTimeout(sizeWriteTimeout);\n            sizeWriteTimeout = globalThis.setTimeout(persistSize, 100);\n          }\n        }\n      }\n      if (isShare) {\n        // Keep unusually tall content accessible without accepting an unbounded height.\n        if (height > 10_000 && Number.parseFloat(frame.style.height) === 0) {\n          frame.style.removeProperty("height");\n        }\n        frame.scrolling = height > 10_000 ? "auto" : "no";\n        document.documentElement.classList.add("visualization-share-ready");\n      }\n      return;\n    }\n    if (data.type === "scroll-to") {\n      const top = data.top;\n      if (\n        typeof top === "number" &&\n        Number.isFinite(top) &&\n        top >= 0 &&\n        globalThis.navigator.userActivation?.isActive === true\n      ) {\n        globalThis.scrollTo({\n          top: Math.ceil(\n            globalThis.scrollY + frame.getBoundingClientRect().top + top,\n          ),\n        });\n      }\n      return;\n    }\n    if (data.type === "open-external") {\n      const rawHref = data.href;\n      if (typeof rawHref !== "string") {\n        return;\n      }\n      let href;\n      try {\n        const url = new URL(rawHref, document.baseURI);\n        if (url.protocol !== "https:") {\n          return;\n        }\n        href = url.href;\n      } catch {\n        return;\n      }\n      if (globalThis.navigator.userActivation?.isActive === true) {\n        const anchor = document.createElement("a");\n        anchor.href = href;\n        anchor.rel = "noopener noreferrer";\n        anchor.target = "_blank";\n        document.body.appendChild(anchor);\n        anchor.click();\n        anchor.remove();\n      }\n      return;\n    }\n    if (data.type === "follow-up") {\n      const prompt = data.prompt;\n      if (\n        typeof prompt !== "string" ||\n        globalThis.navigator.userActivation?.isActive !== true\n      ) {\n        return;\n      }\n      const title = data.title;\n      globalThis.prompt(typeof title === "string" ? title : prompt, prompt);\n    }\n  });\n  channel.port1.start();\n  const srcdoc = frame.dataset.srcdoc;\n  if (srcdoc == null) {\n    return;\n  }\n  globalThis.addEventListener("resize", () => {\n    const height = Number.parseFloat(frame.style.height);\n    if (!isShare && (!Number.isFinite(height) || height <= viewportHeight)) {\n      frame.style.removeProperty("height");\n    }\n    viewportHeight = globalThis.innerHeight;\n    channel.port1.postMessage({ type: "measure" });\n  });\n  frame.addEventListener(\n    "load",\n    () => {\n      frame.contentWindow?.postMessage(\n        { type: "codex-visualization-initialize" },\n        "*",\n        [channel.port2],\n      );\n    },\n    { once: true },\n  );\n  // Match the trusted bootstrap element, not the same text in an authored title.\n  const frameHtml = srcdoc.replace(\n    \'<script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__<\/script>\',\n    () =>\n      \'<script type="application/json" id="codex-visualization-widget-state">\' +\n      JSON.stringify(initialGlobals).replaceAll("<", "\\\\u003c") +\n      "<\/script>",\n  );\n  if (isShare && storage != null) {\n    // Fingerprint the rendered document, including restored widget state, without\n    // storing its content. This is a layout cache, not a security identity.\n    let hash = 5381;\n    for (let index = 0; index < frameHtml.length; index += 1) {\n      hash = (hash * 33 + frameHtml.charCodeAt(index)) % 4_294_967_296;\n    }\n    sizeFingerprint = hash.toString(36);\n    try {\n      const size = JSON.parse(storage.getItem(sizeStorageKey) ?? "null");\n      if (\n        size?.fingerprint === sizeFingerprint &&\n        size.width === frame.clientWidth &&\n        size.viewportHeight === globalThis.innerHeight &&\n        size.dark ===\n          globalThis.matchMedia("(prefers-color-scheme: dark)").matches &&\n        size.scale === globalThis.devicePixelRatio &&\n        typeof size.height === "number" &&\n        Number.isFinite(size.height) &&\n        size.height >= 0 &&\n        size.height <= 10_000\n      ) {\n        frame.style.height = size.height + "px";\n      }\n    } catch {\n      // Ignore missing or invalid cache entries and measure the live frame.\n    }\n  }\n  frame.srcdoc = frameHtml;\n  delete frame.dataset.srcdoc;\n})();\n'.replaceAll("</script","<\\/script")}<\/script>
</body>
</html>
`}function d(n){return n.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}}};