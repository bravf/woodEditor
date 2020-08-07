const { defaults } = require("./defaults.js");
const { cleanUrl, escape } = require("./helpers.js");

/**
 * Renderer
 */
const no = (i) => (i === undefined ? "" : ` no=${i}`);
module.exports = class Renderer {
  constructor(options) {
    this.options = options || defaults;
  }

  code(code, infostring, escaped, startNo) {
    const lang = (infostring || "").match(/\S*/)[0];
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }

    if (!lang) {
      return (
        `<pre${no(startNo)}><code>` +
        (escaped ? code : escape(code, true)) +
        "</code></pre>\n"
      );
    }

    return (
      `<pre${no(startNo)}><code class="` +
      this.options.langPrefix +
      escape(lang, true) +
      '">' +
      (escaped ? code : escape(code, true)) +
      "</code></pre>\n"
    );
  }

  blockquote(quote, startNo) {
    return `<blockquote${no(startNo)}>\n` + quote + "</blockquote>\n";
  }

  html(html, startNo, isBlock = false) {
    if (isBlock) return html.replace(/(<[a-zA-Z0-9\-]+)/, `$1${no(startNo)}`);
    else return html;
  }

  heading(text, level, raw, slugger, startNo) {
    if (this.options.headerIds) {
      return (
        "<h" +
        level +
        `${no(startNo)} id="` +
        this.options.headerPrefix +
        slugger.slug(raw) +
        '">' +
        text +
        "</h" +
        level +
        ">\n"
      );
    }
    // ignore IDs
    return "<h" + level + ">" + text + "</h" + level + ">\n";
  }

  hr(startNo) {
    const _no = no(startNo);
    return this.options.xhtml ? `<hr${_no}/>\n` : `<hr${_no}>\n`;
  }

  list(body, ordered, start, startNo) {
    const type = ordered ? "ol" : "ul",
      startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return (
      "<" + type + startatt + no(startNo) + ">\n" + body + "</" + type + ">\n"
    );
  }

  listitem(text, task, checked, startNo) {
    return `<li${no(startNo)}>` + text + "</li>\n";
  }

  checkbox(checked) {
    return (
      "<input " +
      (checked ? 'checked="" ' : "") +
      'disabled="" type="checkbox"' +
      (this.options.xhtml ? " /" : "") +
      "> "
    );
  }

  paragraph(text, startNo) {
    return `<p${no(startNo)}>` + text + "</p>\n";
  }

  table(header, body) {
    if (body) body = "<tbody>" + body + "</tbody>";

    return (
      "<table>\n" + "<thead>\n" + header + "</thead>\n" + body + "</table>\n"
    );
  }

  tablerow(content, startNo) {
    return `<tr${no(startNo)}>\n` + content + "</tr>\n";
  }

  tablecell(content, flags) {
    const type = flags.header ? "th" : "td";
    const tag = flags.align
      ? "<" + type + ' align="' + flags.align + '">'
      : "<" + type + ">";
    return tag + content + "</" + type + ">\n";
  }

  // span level renderer
  strong(text) {
    return "<strong>" + text + "</strong>";
  }

  em(text) {
    return "<em>" + text + "</em>";
  }

  codespan(text) {
    return "<code>" + text + "</code>";
  }

  br() {
    return this.options.xhtml ? "<br/>" : "<br>";
  }

  del(text) {
    return "<del>" + text + "</del>";
  }

  link(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = '<a href="' + escape(href) + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }

  image(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }

    let out = '<img src="' + href + '" alt="' + text + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += this.options.xhtml ? "/>" : ">";
    return out;
  }

  text(text) {
    return text;
  }
};
