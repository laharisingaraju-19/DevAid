import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
    gfm: true,
    breaks: true
});

window.renderMarkdown = function (text) {
    const html = marked.parse(text);
    return DOMPurify.sanitize(html);
};