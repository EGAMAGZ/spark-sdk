import { describe, expect, it } from 'vitest';
import { convertHtmlToAspx } from '../src/template-converter.ts';

describe('convertHtmlToAspx', () => {
  it('transforms valid HTML with head, body, link, script, and anchor tags', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="/styles/main.css">
          <script src="/scripts/app.js"></script>
        </head>
        <body>
          <a href="/about.html">About</a>
          <div>Hello World</div>
        </body>
      </html>
    `;

    const result = convertHtmlToAspx(html);
    expect(result).toContain('<link rel="stylesheet" href="styles/main.css">');
    expect(result).toContain('<script src="scripts/app.js"></script>');
    expect(result).toContain('<a href="about.aspx">About</a>');
    expect(result).toContain('<div>Hello World</div>');
  });

  it('includes SharePoint page directives', () => {
    const html = '<html><body></body></html>';
    const result = convertHtmlToAspx(html);

    expect(result).toContain('<%@ Page language="C#"');
    expect(result).toContain('MasterPageFile="~masterurl/default.master"');
    expect(result).toContain('<%@ Register Tagprefix="SharePoint"');
    expect(result).toContain('<%@ Register Tagprefix="WebPartPages"');
  });

  it('includes required ASPX content placeholders', () => {
    const html = '<html><body><p>Content</p></body></html>';
    const result = convertHtmlToAspx(html);

    expect(result).toContain('ContentPlaceHolderId="PlaceHolderPageTitle"');
    expect(result).toContain(
      'ContentPlaceHolderId="PlaceHolderAdditionalPageHead"',
    );
    expect(result).toContain('ContentPlaceHolderId="PlaceHolderSearchArea"');
    expect(result).toContain(
      'ContentPlaceHolderId="PlaceHolderPageDescription"',
    );
    expect(result).toContain('ContentPlaceHolderId="PlaceHolderMain"');
  });

  it('wraps body content in PlaceHolderMain with ms-hide WebPartZone', () => {
    const html = '<html><body><p>Test content</p></body></html>';
    const result = convertHtmlToAspx(html);

    expect(result).toContain(
      '<asp:Content ContentPlaceHolderId="PlaceHolderMain"',
    );
    expect(result).toContain('<div class="ms-hide">');
    expect(result).toContain('<WebPartPages:WebPartZone');
    expect(result).toContain('Test content');
  });

  it('handles multiple root-relative links in head', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="/css/a.css">
          <link rel="stylesheet" href="/css/b.css">
          <link rel="icon" href="/favicon.ico">
        </head>
        <body></body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('href="css/a.css"');
    expect(result).toContain('href="css/b.css"');
    expect(result).toContain('href="favicon.ico"');
  });

  it('handles multiple root-relative scripts in head', () => {
    const html = `
      <html>
        <head>
          <script src="/js/vendor.js"></script>
          <script src="/js/app.js"></script>
        </head>
        <body></body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('src="js/vendor.js"');
    expect(result).toContain('src="js/app.js"');
  });

  it('extracts inline style tags and wraps in SharePoint:StyleBlock', () => {
    const html = `
      <html>
        <head>
          <style>.my-class { color: red; }</style>
        </head>
        <body></body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('<SharePoint:StyleBlock runat="server">');
    expect(result).toContain('.my-class { color: red; }');
  });

  it('converts .html href in body to .aspx', () => {
    const html = `
      <html>
        <body>
          <a href="/page.html">Link</a>
          <a href="/dir/file.html">Another</a>
        </body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('href="page.aspx"');
    expect(result).toContain('href="dir/file.aspx"');
  });

  it('does include non-root-relative paths in head output', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="styles/main.css">
          <script src="scripts/app.js"></script>
        </head>
        <body>
          <a href="about.html">Link</a>
        </body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('href="styles/main.css"');
    expect(result).toContain('src="scripts/app.js"');
  });

  it('does include absolute URLs in head output', () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.example.com/style.css">
          <script src="http://example.com/script.js"></script>
        </head>
        <body>
          <a href="https://example.com/page.html">Link</a>
        </body>
      </html>
    `;
    const result = convertHtmlToAspx(html);

    expect(result).toContain('href="https://cdn.example.com/style.css"');
    expect(result).toContain('src="http://example.com/script.js"');
    expect(result).toContain('href="https://example.com/page.html"');
  });

  it('handles empty body gracefully', () => {
    const html =
      '<html><head><link rel="stylesheet" href="/css/style.css"></head><body></body></html>';
    const result = convertHtmlToAspx(html);
    expect(result).toContain('ContentPlaceHolderId="PlaceHolderMain"');
  });

  it('handles HTML without head section', () => {
    const html = '<html><body><p>Content</p></body></html>';
    const result = convertHtmlToAspx(html);
    expect(result).toContain(
      'ContentPlaceHolderId="PlaceHolderAdditionalPageHead"',
    );
    expect(result).toContain('ContentPlaceHolderId="PlaceHolderMain"');
  });

  it('handles img src with root-relative path', () => {
    const html = `
      <html>
        <body>
          <img src="/images/logo.png" alt="Logo">
        </body>
      </html>
    `;
    const result = convertHtmlToAspx(html);
    expect(result).toContain('src="images/logo.png"');
  });
});
