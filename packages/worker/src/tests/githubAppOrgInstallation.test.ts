import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GitHub App Organization Installation (Issue #6)', () => {
  const rootDir = resolve(__dirname, '../../../../');
  const docPath = resolve(rootDir, 'docs/GITHUB_APP_ORG_INSTALLATION.md');
  const contributingPath = resolve(rootDir, 'CONTRIBUTING.md');
  const skillPath = resolve(rootDir, '.github/skills/github-apps-zimb-bot/SKILL.md');

  it('docs/GITHUB_APP_ORG_INSTALLATION.md exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('document covers root causes for missing Install button (Edit button only)', () => {
    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain('Edit');
    expect(doc).toContain('Where can this GitHub App be installed?');
    expect(doc).toContain('Only on this account');
    expect(doc).toContain('Any account');
  });

  it('document specifies required user roles (Organization Owner or GitHub App Manager)', () => {
    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain('Organization Owner');
    expect(doc).toContain('GitHub App Manager');
  });

  it('document covers direct installation URLs and post-installation verification', () => {
    const doc = readFileSync(docPath, 'utf8');
    expect(doc).toContain('/installations/new');
    expect(doc).toContain('Installed GitHub Apps');
    expect(doc).toContain('/settings/installations');
  });

  it('CONTRIBUTING.md contains organization installation troubleshooting and links to guide', () => {
    const contributing = readFileSync(contributingPath, 'utf8');
    expect(contributing).toContain('Install the @zimb-bot GitHub App');
    expect(contributing).toContain('Organization Installation Troubleshooting');
    expect(contributing).toContain('Organization Owner');
    expect(contributing).toContain('Any account');
    expect(contributing).toContain('docs/GITHUB_APP_ORG_INSTALLATION.md');
  });

  it('github-apps-zimb-bot/SKILL.md records the pitfall and solution', () => {
    const skill = readFileSync(skillPath, 'utf8');
    expect(skill).toContain('Installation organisation bloquée');
    expect(skill).toContain('Any account');
    expect(skill).toContain('docs/GITHUB_APP_ORG_INSTALLATION.md');
  });
});
