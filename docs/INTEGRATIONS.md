# Integrations

Agent Loop Kit is designed to stay portable. Prefer `AGENTS.md` export when you want repository-level guidance, MCP when you want runtime discovery, and the Loopwright skill when your host supports local skill bundles.

## English

### AGENTS.md

Export a focused instruction file for coding agents:

```bash
npx agent-loop-kit export-agents-md --out AGENTS.md completion-contract ticket-to-pr-proof
```

Use this path for Codex, GitHub Copilot, and other tools that read `AGENTS.md`.

### Claude Code

Claude Code reads `CLAUDE.md`. Export a Claude-specific file:

```bash
npx agent-loop-kit export-instructions --target claude --out CLAUDE.md completion-contract ticket-to-pr-proof
```

If your repository already uses `AGENTS.md`, a lightweight `CLAUDE.md` can also import it with `@AGENTS.md`.

### Cursor

Cursor can use repository rule files. Export a Cursor rule:

```bash
npx agent-loop-kit export-instructions --target cursor
```

This writes `.cursor/rules/agent-loop-kit.mdc`.

### Gemini CLI

Gemini CLI uses context files such as `GEMINI.md`. Export one with:

```bash
npx agent-loop-kit export-instructions --target gemini --out GEMINI.md completion-contract ticket-to-pr-proof
```

### Google AI Studio

Use Google AI Studio for prompt and agent prototyping. Export copyable loop prompts:

```bash
npx agent-loop-kit export-instructions --target google-ai-studio --out google-ai-studio-loop-prompts.md
```

Paste the relevant loop into system instructions or the prompt area, then run the same checks and evidence requirements before treating the prototype as done.

### Google Stitch

Use Google Stitch or similar AI design tools for UI exploration. Export design-focused loop briefs:

```bash
npx agent-loop-kit export-instructions --target google-stitch --out google-stitch-design-loops.md
```

These briefs prioritize accessibility, responsive behavior, visual evidence, and approval gates for shipping-impacting design choices.

### MCP

Run the stdio MCP server from the project or installed package:

```bash
node bin/agent-loop-mcp.mjs
```

Configure your MCP client to launch that command from the repository root or from the installed package path.

### Loopwright skill

The skill source lives at:

```text
skills/loopwright/
```

For local skill hosts, copy that directory into the host's skill directory. For Codex-style local installs, that is commonly:

```bash
mkdir -p ~/.codex/skills
cp -R skills/loopwright ~/.codex/skills/loopwright
```

OpenAI-compatible skill metadata is kept in:

```text
skills/loopwright/agents/openai.yaml
```

Keep host-specific packaging files when they are required by the target runtime.

## 한국어

Agent Loop Kit은 특정 도구 하나에 묶이지 않도록 설계되어 있습니다. 저장소 지침에는 `AGENTS.md`, Claude Code에는 `CLAUDE.md`, Gemini CLI에는 `GEMINI.md`, Cursor에는 `.cursor/rules/`를 사용하세요. 런타임에서 루프를 검색해야 하면 MCP 서버를 사용합니다.

### AGENTS.md

Codex, GitHub Copilot, 그리고 `AGENTS.md`를 읽는 코딩 에이전트용 지침 파일을 만듭니다.

```bash
npx agent-loop-kit export-agents-md --out AGENTS.md completion-contract ticket-to-pr-proof
```

### Claude Code

Claude Code용 지침은 `CLAUDE.md`로 내보냅니다.

```bash
npx agent-loop-kit export-instructions --target claude --out CLAUDE.md completion-contract ticket-to-pr-proof
```

이미 `AGENTS.md`를 쓰고 있다면 `CLAUDE.md`에서 `@AGENTS.md`로 가져오는 방식도 사용할 수 있습니다.

### Cursor

Cursor 규칙 파일을 생성합니다.

```bash
npx agent-loop-kit export-instructions --target cursor
```

기본 출력 경로는 `.cursor/rules/agent-loop-kit.mdc`입니다.

### Gemini CLI

Gemini CLI용 컨텍스트 파일을 만듭니다.

```bash
npx agent-loop-kit export-instructions --target gemini --out GEMINI.md completion-contract ticket-to-pr-proof
```

### Google AI Studio

Google AI Studio에서 프롬프트나 에이전트 프로토타입을 만들 때 사용할 루프 프롬프트를 내보냅니다.

```bash
npx agent-loop-kit export-instructions --target google-ai-studio --out google-ai-studio-loop-prompts.md
```

필요한 루프를 시스템 지침이나 프롬프트 영역에 붙여 넣고, 완료 전에 체크와 증거 요구사항을 그대로 확인합니다.

### Google Stitch

Google Stitch 같은 AI 디자인 도구에서 사용할 디자인 루프 브리프를 내보냅니다.

```bash
npx agent-loop-kit export-instructions --target google-stitch --out google-stitch-design-loops.md
```

디자인 루프는 접근성, 반응형 화면, 시각적 증거, 그리고 출시 영향이 있는 변경의 승인 절차를 강조합니다.

### MCP

MCP 클라이언트에서 루프를 프롬프트와 리소스로 검색하려면 다음 stdio 서버를 실행하도록 설정합니다.

```bash
node bin/agent-loop-mcp.mjs
```
