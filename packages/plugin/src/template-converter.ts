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

function rewriteBodyUrls(html: string): string {
  const rewrittenSrcAttributes = rewriteRelativeAttributes(
    html,
    'src',
    stripLeadingSlashes,
  );

  return rewriteRelativeAttributes(
    rewrittenSrcAttributes,
    'href',
    (value) => stripLeadingSlashes(value).replace(/\.html$/, '.aspx'),
  );
}

function getTagMatches(html: string, pattern: RegExp): string[] {
  return Array.from(html.matchAll(pattern), (match) => match[0]);
}

function extractExternalAssets(headHtml: string): ExternalAssets {
  console.log(getTagMatches(
    headHtml,
    /<link[^>]+href="https?:\/\/[^"]*"[^>]*>/gi,
  ));
  return {
    link: getTagMatches(
      headHtml,
      /<link[^>]+href="https?:\/\/[^"]*"[^>]*>/gi,
    ),
    script: getTagMatches(
      headHtml,
      /<script[^>]+src="https?:\/\/[^"]*"[^>]*><\/script>/gi,
    ),
    style: getTagMatches(
      headHtml,
      /<style[^>]*>[\s\S]*?<\/style>/gi,
    ),
  };
}

export function convertHtmlToAspx(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';
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
