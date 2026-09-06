import { describe, expect, test } from "bun:test";
import { htmlToPlainText, sanitizeHtml, sanitizeRichText } from "../../lib/sanitize-html";

describe("sanitize-html", () => {
  test("strips script tags", () => {
    const input = '<p>Hello</p><script>alert("x")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  test("strips event handlers", () => {
    const input = '<p onclick="alert(1)">Hi</p>';
    expect(sanitizeHtml(input)).toBe("<p>Hi</p>");
  });

  test("blocks javascript links", () => {
    const input = '<a href="javascript:alert(1)">bad</a>';
    expect(sanitizeHtml(input)).toBe("<a>bad</a>");
  });

  test("keeps allowed formatting", () => {
    const input = "<p><strong>Bold</strong> and <code>code</code></p>";
    expect(sanitizeHtml(input)).toContain("<strong>Bold</strong>");
    expect(sanitizeHtml(input)).toContain("<code>code</code>");
  });

  test("generates plain text", () => {
    const result = sanitizeRichText("<p>Line one</p><ul><li>Item</li></ul>");
    expect(result.bodyText).toContain("Line one");
    expect(result.bodyText).toContain("- Item");
    expect(htmlToPlainText(result.bodyHtml)).toBe(result.bodyText);
  });

  test("allows support attachment images and strips unsafe src", () => {
    const safe = sanitizeHtml(
      '<p>See</p><img src="support_attachments/user1/abc/image.webp" alt="shot">',
    );
    expect(safe).toContain('src="support_attachments/user1/abc/image.webp"');

    const blocked = sanitizeHtml('<img src="https://evil.test/x.png">');
    expect(blocked).not.toContain("<img");
  });
});
