// 加粗、斜体
import "./index.scss";
import "./theme.css";
import codeMirror from "codemirror";
import "codemirror/mode/markdown/markdown.js";
import "codemirror/lib/codemirror.css";
import marked from "./marked/src/marked";
import throttle from "lodash.throttle";
import $, { each } from "jquery";
window.$ = $;

const throttleTime = 50;
const $editor = document.querySelector("#textarea");
const $result = document.querySelector("#result");
const $resultBox = document.querySelector("#resultBox");
const initValue = $editor.innerHTML;
const $code = codeMirror.fromTextArea($editor, {
  mode: "markdown",
  lineNumbers: true,
  lineWrapping: true,
  firstLineNumber: 0,
});
// const $codeScroller = document.querySelector(".CodeMirror-scroll");
// const $virtual = document.querySelector(".CodeMirror-lines").parentElement;
const flt = (str) => parseFloat(str) || 0;
const getOffsetTop = ($dom) =>
  $($dom).offset().top - $($resultBox).offset().top;

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
      if (["heading", "space", "code", "hr", "text", "table"].includes(type)) {
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
};

let isResultScroll = false;

const getCodeTopLine = () => {
  const scrollInfo = $code.getScrollInfo();
  const lineNo = $code.coordsChar(scrollInfo, "local").line;
  let percent = 0;

  // 获取此行的滚动距离
  // 获取单行滚动比例没有意义
  // let $line = $virtual.querySelector(`[no="${lineNo}"]`);
  // if ($line) {
  //   $line = $line.parentElement;
  //   const scroll =
  //     $codeScroller.scrollTop - flt($virtual.style.top) - $line.offsetTop;
  //   if (scroll > 0) {
  //     percent = Math.min(1, scroll / $line.offsetHeight);
  //   }
  // }

  return { lineNo, percent };
};

const scrollResult = (line) => {
  const { lineNo } = line;
  let $block;
  let blockNo;
  let noLength = 1;
  for (let $ele of $resultBox.querySelectorAll("[no]")) {
    const no = parseInt($ele.getAttribute("no"));

    if (no > lineNo) {
      noLength = no - blockNo;
      break;
    } else {
      $block = $ele;
      blockNo = no;
    }
  }
  const top =
    getOffsetTop($block) +
    ($block.offsetHeight * (lineNo - blockNo)) / noLength;
  $result.scrollTo(0, top);
};

const scrollCode = (line) => {
  const { lineNo } = line;
  const top = $code.charCoords({ line: lineNo, ch: 0 }, "local").top;
  $code.scrollTo(null, top);
};

// 获取 result 当前的 line 信息
const getResultTopLine = () => {
  const scrollTop = $result.scrollTop;
  let $block;
  let blocki;
  let percent;
  const $blocks = $result.querySelectorAll("[no]");

  Array.from($blocks).some(($ele, i) => {
    const style = window.getComputedStyle($ele);
    const marginTop = parseInt(style.marginTop);
    const marginBottom = parseInt(style.marginBottom);
    const beginTop = getOffsetTop($ele) - marginTop;
    const endTop = beginTop + $ele.offsetHeight + marginBottom;

    if (scrollTop >= beginTop && scrollTop <= endTop) {
      $block = $ele;
      blocki = i;
      percent = (scrollTop - beginTop) / (endTop - beginTop);
      return true;
    }
  });

  if (!$block) {
    return null;
  }

  const beginLineNo = parseInt($block.getAttribute("no"));
  let noLength = 0;
  if ($blocks[blocki + 1]) {
    noLength = parseInt($blocks[blocki + 1].getAttribute("no")) - beginLineNo;
  }
  const lineNo = beginLineNo + Math.round(noLength * percent);
  return { lineNo, percent };
};

$result.addEventListener(
  "scroll",
  throttle(() => {
    if (!isResultScroll) return;
    const line = getResultTopLine();
    line && scrollCode(line);
  }, throttleTime)
);
$result.addEventListener("mouseover", () => {
  isResultScroll = true;
});
$result.addEventListener("mouseout", () => {
  isResultScroll = false;
});

$code.on(
  "change",
  throttle(() => {
    render();
  }, throttleTime)
);
$code.on(
  "scroll",
  throttle(() => {
    if (isResultScroll) return;
    const line = getCodeTopLine();
    scrollResult(line);
  }, throttleTime)
);
$code.on("renderLine", (instance, line, element) => {
  const lineNo = $code.getLineNumber(line);
  element.setAttribute("no", lineNo);
});
$code.setValue(initValue);
