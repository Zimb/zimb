import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.cxx': 'C++',
  '.cc': 'C++',
  '.c': 'C',
  '.h': 'C',
  '.swift': 'Swift',
  '.m': 'Objective-C',
  '.scala': 'Scala',
  '.sh': 'Shell',
  '.bash': 'Shell',
};

export interface LanguageCount {
  language: string;
  count: number;
  percentage: number;
}

/**
 * Walks the workspace and returns top languages with percentages.
 * Used to prefill the ticket form (CT-VSC-02).
 */
export class LanguageDetector {
  async detect(workspaceFolder?: vscode.WorkspaceFolder): Promise<LanguageCount[]> {
    const folder =
      workspaceFolder ??
      vscode.workspace.workspaceFolders?.[0] ??
      (() => {
        throw new Error('No workspace folder open');
      })();

    const counts = new Map<string, number>();
    let total = 0;

    await this.walk(folder.uri.fsPath, counts, async () => {
      total++;
    });

    counts.forEach((count, ext) => {
      const lang = EXT_TO_LANG[ext];
      if (lang && count > 0) {
        counts.set(lang, count);
      } else if (!EXT_TO_LANG[ext]) {
        counts.delete(ext);
      }
    });

    // Convert to percentage
    const entries: LanguageCount[] = [];
    counts.forEach((count, language) => {
      entries.push({
        language,
        count,
        percentage: Math.round((count / Math.max(total, 1)) * 100),
      });
    });

    return entries.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  private async walk(
    dir: string,
    counts: Map<string, number>,
    onFile: () => Promise<void>
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.walk(fullPath, counts, onFile);
      } else if (entry.isFile()) {
        await onFile();
        const ext = path.extname(entry.name);
        if (ext) {
          counts.set(ext, (counts.get(ext) ?? 0) + 1);
        }
      }
    }
  }
}
