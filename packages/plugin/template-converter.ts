type ExternalAssets = {
  link: string[];
  script: string[];
  style: string[];
};

function rewriteImageUrls(html: string): string {
  return html.replace(/src="([^"]+)"/gi, (match, url) => {
    if (url.startsWith('/')) {
      const newSrc = url.replace(/^\/+/, '');
      return `src="${newSrc}"`;
    }
    return match;
  });
}

function rewriteAnchorHrefs(html: string): string {
  return html.replace(/href="([^"]+)"/gi, (match, url) => {
    if (url.startsWith('/')) {
      const newHref = url
        .replace(/^\/+/, '')
        .replace(/\.html$/, '.aspx');
      return `href="${newHref}"`;
    }
    return match;
  });
}

function extractExternalAssets(headHtml: string): ExternalAssets {
  const tags: ExternalAssets = {
    link: [],
    script: [],
    style: [],
  };

  const linkMatches = headHtml.matchAll(
    /<link[^>]+href="https?:\/\/[^"]*"[^>]*>/gi,
  );

  tags.link.push(
    ...Array.from(linkMatches).map((match) => {
      return match[0].replace(/href="([^"]+)"/gi, (match, url) => {
        if (url.startsWith('/')) {
          const newHref = url.replace(/^\/+/, '');
          return `href="${newHref}"`;
        }
        return match;
      });
    }),
  );

  const scriptMatches = headHtml.matchAll(
    /<script[^>]+src="https?:\/\/[^"]*"[^>]*><\/script>/gi,
  );
  tags.script.push(
    ...Array.from(scriptMatches).map((match) => {
      return match[0].replace(/src="([^"]+)"/gi, (match, url) => {
        if (url.startsWith('/')) {
          const newSrc = url.replace(/^\/+/, '');
          return `src="${newSrc}"`;
        }
        return match;
      });
    }),
  );

  const styleMatches = headHtml.matchAll(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
  );
  tags.style.push(...Array.from(styleMatches).map((match) => match[0]));

  return tags;
}

export function convertHtmlToAspx(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

  const rewrittenBody = rewriteImageUrls(rewriteAnchorHrefs(bodyContent));

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '';
  const extraHeadTags = extractExternalAssets(headContent);

  return [
    `<%@ Page language="C#" MasterPageFile="~masterurl/default.master"    Inherits="Microsoft.SharePoint.WebPartPages.WebPartPage,Microsoft.SharePoint,Version=16.0.0.0,Culture=neutral,PublicKeyToken=71e9bce111e9429c" meta:progid="SharePoint.WebPartPage.Document"  %>`,
    `<%@ Register Tagprefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Register Tagprefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Import Namespace="Microsoft.SharePoint" %> <%@ Assembly Name="Microsoft.Web.CommandUI, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %> <%@ Register Tagprefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>`,

    `<asp:Content ContentPlaceHolderId="PlaceHolderPageTitle" runat="server">`,
    ` <SharePoint:ListItemProperty Property="BaseName" maxlength="40" runat="server"/>`,
    `</asp:Content>`,

    `<asp:Content ContentPlaceHolderId="PlaceHolderAdditionalPageHead" runat="server">`,

    ` <meta name="GENERATOR" content="Microsoft SharePoint" />`,
    ` <meta name="ProgId" content="SharePoint.WebPartPage.Document" /> `,
    ` <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />  `,
    `	<meta name="CollaborationServer" content="SharePoint Team Web Site" />  `,
    `	<SharePoint:ScriptBlock runat="server">`,
    `   var navBarHelpOverrideKey = "WSSEndUser";`,
    ` </SharePoint:ScriptBlock>`,
    ` ${extraHeadTags.script ? extraHeadTags.script.join('\n') : null}`,
    ` ${extraHeadTags.link ? extraHeadTags.link.join('\n') : null}`,
    ` ${
      extraHeadTags.style
        ? `<SharePoint:StyleBlock runat="server"> ${
          extraHeadTags.style.join('\n')
        } </SharePoint:StyleBlock>`
        : null
    }`,
    `</asp:Content> `,

    `<asp:Content ContentPlaceHolderId="PlaceHolderSearchArea" runat="server">`,
    ` <SharePoint:DelegateControl runat="server" ControlId="SmallSearchInputBox"/>`,
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderPageDescription" runat="server">`,
    ` <SharePoint:ProjectProperty Property="Description" runat="server"/>`,
    `</asp:Content>`,
    `<asp:Content ContentPlaceHolderId="PlaceHolderMain" runat="server">`,
    ` <div class="ms-hide"`,
    `   <WebPartPages:WebPartZone runat="server" title="loc:TitleBar" id="TitleBar" AllowLayoutChange="false" AllowPersonalization="false" Style="display:none;"><ZoneTemplate></ZoneTemplate></WebPartPages:WebPartZone`,
    ` </div`,
    ` ${rewrittenBody}`,
    `</asp:Content>`,
  ].filter((line) => line !== null)
    .join('\n')
    .trim();
}
