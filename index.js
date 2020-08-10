// 加粗、斜体
import "./index.scss";
import "github-markdown-css";
import codeMirror from "codemirror";
import "codemirror/mode/markdown/markdown.js";
import "codemirror/lib/codemirror.css";
import marked from "./marked/src/marked";
import throttle from "lodash.throttle";
import debounce from "lodash.debounce";
import $ from "jquery";
window.$ = $;

const throttleTime = 100;
const $editor = document.querySelector("#textarea");
const $result = document.querySelector("#result");
const $resultBox = document.querySelector("#resultBox");
const initValue = $editor.value;
const $code = codeMirror.fromTextArea($editor, {
  mode: "markdown",
  lineNumbers: true,
  lineWrapping: true,
  firstLineNumber: 0,
});
const flt = (str) => parseFloat(str) || 0;
const getOffsetTop = ($dom) =>
  $($dom).offset().top - $($resultBox).offset().top;

// block 位置记录和操作
let blockPosTags = [];
const getblockPosTags = () => {
  blockPosTags = Array.from($result.querySelectorAll("[no]")).map(($el) => {
    return flt($el.getAttribute("no"));
  });
};
const getBlockPos = (no) => {
  let startPos = blockPosTags[0];
  let endPos = startPos;
  for (let i = 0, tag; i < blockPosTags.length; i++) {
    tag = blockPosTags[i];
    endPos = tag;
    if (endPos > no) {
      break;
    } else {
      startPos = tag;
    }
  }
  return { startPos, endPos };
};

// 给 tokens 设置行号
const setLineNo = (tokens) => {
  let no = 0;
  const eat = (str) => {
    const no2 = no;
    no += str.split(/\n/g).length - 1;
    return no2;
  };
  const f = (_tokens) => {
    _tokens.forEach((token, i) => {
      const { type, raw } = token;
      if (type === "placeholder") {
        token.startNo = eat(raw);
        return;
      }
      if (
        ["heading", "space", "code", "hr", "text", "table", "html"].includes(
          type
        )
      ) {
        token.startNo = eat(raw);
        return;
      }
      if ("blockquote" === type) {
        token.startNo = eat(raw + "\n");
        return;
      }
      if (type === "paragraph") {
        const isNextSpae = _tokens[i + 1]?.type === "space";
        token.startNo = eat(raw + (isNextSpae ? "" : "\n"));
        return;
      }
      if (type === "list") {
        return f(token.items);
      }
      if (type === "list_item") {
        if (token.tokens.slice(-1)[0]?.type === "list") {
          token.startNo = eat(token.tokens[0].raw + "\n");
          return f(token.tokens.slice(1));
        } else {
          let str = token.raw;
          if (token.tokens[1]?.type !== "space") {
            str += "\n";
          }
          token.startNo = eat(str);
        }
      }
    });
  };
  f(tokens);
};
// 后置处理，对于一些嵌套标签
const setLineNoAfter = () => {
  for (let $ele of $resultBox.querySelectorAll("li[no]")) {
    let firstChild = $ele.firstChild;
    if (firstChild.nodeType === 3) {
      const newFirstChild = document.createElement("p");
      $ele.insertBefore(newFirstChild, firstChild);
      newFirstChild.appendChild(firstChild);
      firstChild = newFirstChild;
    }
    firstChild.setAttribute("no", parseInt($ele.getAttribute("no")));
    $ele.removeAttribute("no");
  }
};

const render = () => {
  const tokens = marked.lexer($code.getValue());
  setLineNo(tokens);
  const html = marked.parser(tokens);
  $resultBox.innerHTML = html;
  setLineNoAfter();
  getblockPosTags();
};

let isResultScroll = false;

const getCodeLineTop = (line) => $code.charCoords({ line, ch: 0 }, "local").top;
const getCodeTopLine = () => {
  const scrollInfo = $code.getScrollInfo();
  return $code.coordsChar(scrollInfo, "local").line;
};
const getCodeBlockScrollPercent = (line, blockPos) => {
  const { startPos, endPos } = blockPos;
  const currTop = getCodeLineTop(line);
  const startTop = getCodeLineTop(startPos);
  const endTop = getCodeLineTop(endPos);
  const total = endTop - startTop;
  if (total === 0) {
    return 0;
  }

  return (currTop - startTop) / (endTop - startTop);
};
const getCodeBlockInfo = () => {
  const line = getCodeTopLine();
  const blockPos = getBlockPos(line);
  const percent = getCodeBlockScrollPercent(line, blockPos);
  return { blockPos, percent };
};
const scrollCode = (blockInfo) => {
  const { blockPos, percent } = blockInfo;
  const { startPos, endPos } = blockPos;
  const startTop = getCodeLineTop(startPos);
  const endTop = getCodeLineTop(endPos);
  const top = startTop + (endTop - startTop) * percent;
  $code.scrollTo(null, top);
};
$code.on(
  "change",
  throttle(() => {
    render();
  }, 1000)
);
$code.on(
  "scroll",
  throttle(() => {
    if (isResultScroll) return;
    scrollResult(getCodeBlockInfo());
  }, throttleTime)
);
$code.setValue(initValue);

// 获取 result 当前的 line 信息
const getResultBlockInfo = () => {
  const scrollTop = $result.scrollTop;
  let no = null;
  let percent;
  const $blocks = $result.querySelectorAll("[no]");

  Array.from($blocks).some(($ele, i) => {
    const style = window.getComputedStyle($ele);
    const marginTop = parseInt(style.marginTop);
    const marginBottom = parseInt(style.marginBottom);
    const beginTop = getOffsetTop($ele) - marginTop;
    const endTop = beginTop + $ele.offsetHeight + marginBottom;

    if (scrollTop >= beginTop && scrollTop <= endTop) {
      no = flt($ele.getAttribute("no"));
      percent = (scrollTop - beginTop) / (endTop - beginTop);
      return true;
    }
  });

  if (no === null) {
    return null;
  }
  const blockPos = getBlockPos(no);
  return { blockPos, percent };
};
const scrollResult = (blockInfo) => {
  const { blockPos, percent } = blockInfo;
  const { startPos } = blockPos;
  const $block = $resultBox.querySelector(`[no="${startPos}"]`);
  const top = getOffsetTop($block) + $block.offsetHeight * percent;
  $result.scrollTo(0, top);
};

$result.addEventListener(
  "scroll",
  throttle(() => {
    if (!isResultScroll) return;
    const resultBlockInfo = getResultBlockInfo();
    if (resultBlockInfo !== null) {
      scrollCode(resultBlockInfo);
    }
  }, throttleTime)
);
$result.addEventListener("mouseover", () => {
  isResultScroll = true;
});
$result.addEventListener("mouseout", () => {
  isResultScroll = false;
});
