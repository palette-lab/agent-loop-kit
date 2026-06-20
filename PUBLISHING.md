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

## Publish to npm later

```bash
npm login
npm run prepare:release
npm publish --access public
```
