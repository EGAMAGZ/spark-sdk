type ExternalAssets = {
  link: string[];
  script: string[];
  style: string[];
};

const PAGE_DIRECTIVE =
  `<%@ Page language="C#" MasterPageFile="~masterurl/default.master"    Inherits="Microsoft.SharePoint.WebPartPages.WebPartPage,Microsoft.SharePoint,Version=16.0.0.0,Culture=neutral,PublicKeyToken=71e9bce111e9429c" meta:progid="SharePoint.WebPartPage.Document"  %>`;

const REGISTER_DIRECTIVES =
  `<%@ Register Tagprefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Register Tagprefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Import Namespace="Microsoft.SharePoint" %> <%@ Assembly Name="Microsoft.Web.CommandUI, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Register Tagprefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>`;

function stripLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, '');
}

/**
 * Rewrites matching attribute values in an HTML fragment when they are
 * root-relative paths (start with `/`).
 *
 * @param html HTML fragment to rewrite.
 * @param attribute Attribute name to rewrite (`href` or `src`).
 * @param formatter Formatter applied to matched root-relative attribute values.
 * @returns HTML fragment with rewritten attribute values.
 */
function rewriteRelativeAttributes(
  html: string,
  attribute: 'href' | 'src',
  formatter: (value: string) => string,
): string {
  const pattern = new RegExp(`${attribute}="([^"]+)"`, 'gi');

  return html.replace(pattern, (match, value: string) => {
    if (!value.startsWith('/')) {
      return match;
    }

    return `${attribute}="${formatter(value)}"`;
  });
}
/**
 * Rewrites root-relative `src` and `href` URLs in body markup so they are
 * compatible with generated ASPX output.
 *
 * `href` values ending in `.html` are converted to `.aspx`.
 *
 * @param html Body HTML content.
 * @returns Rewritten body HTML content.
 */
function rewriteBodyUrls(html: string): string {
  const rewrittenSrcAttributes = rewriteRelativeAttributes(
    html,
    'src',
    stripLeadingSlashes,
  );

  const rewrittenLocalHrefsLinks = rewriteRelativeAttributes(
    rewrittenSrcAttributes,
    'href',
    (value) => stripLeadingSlashes(value).replace(/\.html$/, '.aspx'),
  );

  return rewrittenLocalHrefsLinks;
}

/**
 * Extracts full tag matches for a given regex pattern.
 *
 * @param html HTML source text.
 * @param pattern Regular expression used to match complete tags.
 * @returns Array of matched tag strings.
 */
function getTagMatches(html: string, pattern: RegExp): string[] {
  return Array.from(html.matchAll(pattern), (match) => match[0].trim());
}

/**
 * Extracts root-relative external asset tags from the head section.
 *
 * Link and script source URLs are normalized by removing leading slashes.
 *
 * @param headHtml Raw `<head>` content.
 * @returns Grouped external assets (`link`, `script`, and inline `style` tags).
 */
function extractExternalAssets(headHtml: string): ExternalAssets {
  return {
    link: getTagMatches(
      headHtml,
      /<link[^>]+href="[^"]*"[^>]*>/gi,
    ).map((tag) => rewriteRelativeAttributes(tag, 'href', stripLeadingSlashes)),
    script: getTagMatches(
      headHtml,
      /<script[^>]+src="[^"]*"[^>]*><\/script>/gi,
    ).map((tag) => rewriteRelativeAttributes(tag, 'src', stripLeadingSlashes)),
    style: getTagMatches(
      headHtml,
      /<style[^>]*>[\s\S]*?<\/style>/gi,
    ),
  };
}

/**
 * Converts a full HTML document into a SharePoint-compatible ASPX page layout.
 *
 * The converter:
 * - reads and rewrites body links/resources,
 * - extracts supported assets from `<head>`,
 * - injects SharePoint page directives and placeholders,
 * - emits the final ASPX markup as a single string.
 *
 * @param html Full HTML document.
 * @returns Generated ASPX content.
 */
export function convertHtmlToAspx(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : '';
  const rewrittenBody = rewriteBodyUrls(bodyContent);

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '';
  const extraHeadTags = extractExternalAssets(headContent);

  const convertedTemplate = [
    PAGE_DIRECTIVE,
    REGISTER_DIRECTIVES,
    `<asp:Content ContentPlaceHolderId="PlaceHolderPageTitle" runat="server">`,
    ` <SharePoint:ListItemProperty Property="BaseName" maxlength="40" runat="server"/>`,
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderAdditionalPageHead" runat="server">`,
    ` <meta name="GENERATOR" content="Microsoft SharePoint" />`,
    ` <meta name="ProgId" content="SharePoint.WebPartPage.Document" />`,
    ` <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />`,
    `\t<meta name="CollaborationServer" content="SharePoint Team Web Site" />`,
    `\t<SharePoint:ScriptBlock runat="server">`,
    `   var navBarHelpOverrideKey = "WSSEndUser";`,
    ` </SharePoint:ScriptBlock>`,
  ];

  if (extraHeadTags.script.length > 0) {
    convertedTemplate.push(` ${extraHeadTags.script.join('\n')}`);
  }

  if (extraHeadTags.link.length > 0) {
    convertedTemplate.push(` ${extraHeadTags.link.join('\n')}`);
  }

  if (extraHeadTags.style.length > 0) {
    convertedTemplate.push(
      ` <SharePoint:StyleBlock runat="server">`,
      ` ${extraHeadTags.style.join('\n')}`,
      ` </SharePoint:StyleBlock>`,
    );
  }

  convertedTemplate.push(
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderSearchArea" runat="server">`,
    ` <SharePoint:DelegateControl runat="server" ControlId="SmallSearchInputBox"/>`,
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderPageDescription" runat="server">`,
    ` <SharePoint:ProjectProperty Property="Description" runat="server"/>`,
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderMain" runat="server">`,
    ` <div class="ms-hide">`,
    `   <WebPartPages:WebPartZone runat="server" title="loc:TitleBar" id="TitleBar" AllowLayoutChange="false" AllowPersonalization="false" Style="display:none;"><ZoneTemplate></ZoneTemplate></WebPartPages:WebPartZone>`,
    ` </div>`,
    ` ${rewrittenBody}`,
    `</asp:Content>`,
  );

  return convertedTemplate.join('\n').trim();
}
