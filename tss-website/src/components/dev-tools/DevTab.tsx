"use client";

import { useLanguage } from "@/hooks/use-translation";
import { decodeBase64, encodeBase64 } from "./codecs";
import { EncodeDecodeTool, HashTool, JsonTool, JwtTool } from "./DataTools";
import { LoremTool, PasswordTool, UuidTool } from "./GeneratorTools";
import { CaseTool, DiffTool, NumberBaseTool, RegexTool } from "./TextTools";
import { ToolGroups } from "./ToolGroups";

export function DevTools() {
  const { t } = useLanguage();
  return (
    <ToolGroups
      tab="dev"
      groups={[
        {
          id: "data",
          title: t.devTools.catDevData,
          content: (
            <>
              <JsonTool />
              <EncodeDecodeTool id="dt-b64" title={t.devTools.base64Title} description={t.devTools.base64Desc} encode={encodeBase64} decode={decodeBase64} />
              <EncodeDecodeTool id="dt-url" title={t.devTools.urlTitle} description={t.devTools.urlDesc} encode={encodeURIComponent} decode={decodeURIComponent} />
              <NumberBaseTool />
              <CaseTool />
            </>
          ),
        },
        { id: "text", title: t.devTools.catDevText, content: <><RegexTool /><DiffTool /></> },
        { id: "security", title: t.devTools.catDevSecurity, content: <><JwtTool /><HashTool /><PasswordTool /></> },
        { id: "generators", title: t.devTools.catDevGenerators, content: <><UuidTool /><LoremTool /></> },
      ]}
    />
  );
}
