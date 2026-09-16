import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

/**
 * Detects the GitHub repo URL from the current workspace's git remote.
 * Used to prefill the ticket form (SPEC §3.3).
 */
export class RepoDetector {
  async detect(workspaceFolder?: vscode.WorkspaceFolder): Promise<string | undefined> {
    const folder =
      workspaceFolder ??
      vscode.workspace.workspaceFolders?.[0] ??
      (() => {
        throw new Error('No workspace folder open');
      })();

    try {
      const { stdout } = await execAsync('git config --get remote.origin.url', {
        cwd: folder.uri.fsPath,
      });
      return this.normalize(stdout.trim());
    } catch {
      return undefined;
    }
  }

  /**
   * Converts SSH or git protocol URLs to https://github.com/owner/repo.
   */
  private normalize(url: string): string | undefined {
    // git@github.com:owner/repo.git
    const sshMatch = url.match(/git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      return `https://github.com/${sshMatch[1]}`;
    }

    // https://github.com/owner/repo.git
    const httpsMatch = url.match(/https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
    if (httpsMatch) {
      return `https://github.com/${httpsMatch[1]}`;
    }

    return undefined;
  }
}
