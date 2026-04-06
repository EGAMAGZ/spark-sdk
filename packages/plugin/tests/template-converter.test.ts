import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { convertHtmlToAspx } from '../src/template-converter.ts';

describe('convertHtmlToAspx', () => {
  it('transforms valid HTML with head, body, link, script, and anchor tags', () => {
    const html = `
      <html>
        <head>
          <link rel=\"stylesheet\" href=\"/styles/main.css\">
          <script src=\"/scripts/app.js\"></script>
        </head>
        <body>
          <a href=\"/about.html\">About</a>
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
});
