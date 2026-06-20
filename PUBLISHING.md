# Publishing to GitHub

Confirm `palette-lab` is the final GitHub owner in `package.json` before publishing.

## Option A: GitHub CLI

```bash
git init
git add .
git commit -m "Initial open-source release"
gh repo create palette-lab/agent-loop-kit --public --source=. --remote=origin --push
```

## Option B: existing empty repository

```bash
git init
git add .
git commit -m "Initial open-source release"
git branch -M main
git remote add origin git@github.com-work:palette-lab/agent-loop-kit.git
git push -u origin main
```

## Enable GitHub Pages

The `pages.yml` workflow builds `dist/` and deploys it. In repository settings, set Pages source to GitHub Actions.

If the workflow fails with `HttpError: Not Found` during `actions/deploy-pages`, Pages has not been enabled for the repository yet. This is a repository setting, not a build error. Open:

```text
https://github.com/palette-lab/agent-loop-kit/settings/pages
```

Then set Build and deployment -> Source to GitHub Actions and rerun the `pages` workflow.

The workflow uses `actions/upload-pages-artifact` with hidden files enabled so `dist/.well-known/ai-catalog.json` is included in the deployed site.

## Package the Loopwright skill

The skill source of truth is `skills/loopwright/`. Build the release ZIP from source:

```bash
npm run package:skill
```

This writes `dist/loopwright-skill.zip`.

## Publish to npm later

```bash
npm login
npm run prepare:release
npm publish --access public
```
