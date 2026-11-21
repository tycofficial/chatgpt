export const __rspack_esm_ids=[292210];export const __webpack_modules__={MAWH(a,b,c){let d=String.raw`(() => {
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
`;c.d(b,{},{a:d})},oeA4(a,b,c){function d(a){return 34===a?"&quot;":38===a?"&amp;":39===a?"&apos;":60===a?"&lt;":62===a?"&gt;":"&nbsp;"}c.r(b);let e=/["&'<>\u0080-\uFFFF]/g;function f(a){return a>=128||a>=32&&a<64&&(0x500000c4>>>a&1)==1}function g(a){let b,{length:c}=a,g=0,h=0;for(;h<c;){let i=a.charCodeAt(h);if(!f(i)){let b=Math.min(h+32,c),d=h+1;for(;d<b&&!f(a.charCodeAt(d));)d++;if(d<b){h=d;continue}if(d>=c||(e.lastIndex=d,!e.test(a)))break;h=e.lastIndex-1;continue}if(void 0===b?b=a.substring(0,h):g!==h&&(b+=a.substring(g,h)),i<64){b+=d(i),g=h+=1;continue}let j=a.codePointAt(h);b+=`&#${j};`,j!==i&&h++,g=h+=1}return void 0===b?a:(g<c&&(b+=a.substr(g)),b)}function h(a,b){if(a.lastIndex=0,!a.test(b))return b;let c="",e=0;do{let f=a.lastIndex-1;e!==f&&(c+=b.substring(e,f)),c+=d(b.charCodeAt(f)),e=f+1}while(a.test(b))return c+b.substring(e)}let i=/["&'<>]/g,j=/["&<>\u{A0}]/gu,k=/[&<>\u{A0}]/gu;c.d(b,{},{XML_BITSET_VALUE:0x500000c4,encodeXML:g,escape:g,escapeAttribute:function(a){return h(j,a)},escapeText:function(a){return h(k,a)},escapeUTF8:function(a){return h(i,a)},xmlEncodeRegex:e})}};