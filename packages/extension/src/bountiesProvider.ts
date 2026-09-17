/**
 * bountiesProvider.ts — TreeDataProvider for the Zimb sidebar.
 *
 * Shows all open bounties in the current GitHub repo, grouped by status.
 * Click an item to open the issue in the browser.
 *
 * Skills: .github/skills/vscode-chat-extensions/SKILL.md (TreeView pattern)
 */
import * as vscode from 'vscode';
import type { GitHubAuthService } from './auth/github';
import type { IssueCreator } from './services/issueCreator';

export type BountyStatus = 'open' | 'claimed' | 'delivered' | 'closed';

export interface BountyIssue {
  number: number;
  title: string;
  htmlUrl: string;
  status: BountyStatus;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  labels: string[];
  body: string;
  bounty?: number;
  owner: string;
  repo: string;
}

/**
 * Group node (Open / Claimed / Delivered / Closed).
 */
export class BountyGroup extends vscode.TreeItem {
  override readonly iconPath: vscode.ThemeIcon;
  override readonly description: string;
  readonly count: number;
  readonly groupKey: BountyStatus;
  readonly state: vscode.TreeItemCollapsibleState;
  constructor(
    groupKey: BountyStatus,
    count: number,
    state: vscode.TreeItemCollapsibleState
  ) {
    super(labelFor(groupKey), state);
    this.groupKey = groupKey;
    this.count = count;
    this.state = state;
    this.description = `${count}`;
    this.contextValue = `bounty-group-${groupKey}`;
    this.iconPath = iconFor(groupKey) as vscode.ThemeIcon;
  }
}

/**
 * One bounty issue node.
 */
export class BountyItem extends vscode.TreeItem {
  override readonly iconPath: vscode.ThemeIcon;
  constructor(public readonly issue: BountyIssue) {
    super(`#${issue.number} ${issue.title}`, vscode.TreeItemCollapsibleState.None);
    this.description = relativeTime(issue.updatedAt);
    this.tooltip = `${issue.title}\n${issue.body?.slice(0, 200) ?? ''}\nUpdated ${new Date(issue.updatedAt).toLocaleString()}`;
    this.contextValue = 'bounty-item';
    this.iconPath = iconFor(issue.status) as vscode.ThemeIcon;

    if (issue.assignees.length > 0) {
      this.description += ` · @${issue.assignees[0]}`;
    }
    if (issue.bounty !== undefined) {
      this.description += ` · ${issue.bounty}€`;
    }

    this.command = {
      command: 'zimb.openBounty',
      title: 'Open bounty on GitHub',
      arguments: [issue],
    };
  }
}

export type BountyNode = BountyGroup | BountyItem;

/**
 * Tree data provider — fetches bounties via the GitHub API.
 */
export class BountiesProvider implements vscode.TreeDataProvider<BountyNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<BountyNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cache: Map<string, BountyIssue[]> = new Map();
  private loading = false;

  constructor(
    private readonly auth: GitHubAuthService,
    private readonly issueCreator: IssueCreator,
    private readonly context: vscode.ExtensionContext
  ) {}

  /** Tell VS Code to refresh the tree. */
  refresh(): void {
    this.cache.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  /** Called when the user clicks "Open Bounties" or on activation. */
  async bootstrap(): Promise<void> {
    await this.loadAll();
  }

  /**
   * Public snapshot — used by the `@zimb /bounties` chat command to render a
   * summary in the chat panel. Returns the cached bounties sorted by status.
   */
  getSnapshot(): BountyIssue[] {
    return this.collectAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /** True if the provider has loaded anything yet. */
  get hasLoaded(): boolean {
    return this.cache.size > 0 && this.cache.get('error') === undefined;
  }

  getTreeItem(node: BountyNode): vscode.TreeItem {
    return node;
  }

  async getChildren(node?: BountyNode): Promise<BountyNode[]> {
    // Root: 4 groups in fixed order
    if (!node) {
      const all = this.collectAll();
      return [
        new BountyGroup('open', all.filter((b) => b.status === 'open').length, vscode.TreeItemCollapsibleState.Expanded),
        new BountyGroup('claimed', all.filter((b) => b.status === 'claimed').length, vscode.TreeItemCollapsibleState.Collapsed),
        new BountyGroup('delivered', all.filter((b) => b.status === 'delivered').length, vscode.TreeItemCollapsibleState.Collapsed),
        new BountyGroup('closed', all.filter((b) => b.status === 'closed').length, vscode.TreeItemCollapsibleState.Collapsed),
      ];
    }
    // Group node: list its bounties
    if (node instanceof BountyGroup) {
      return this.collectAll()
        .filter((b) => b.status === node.groupKey)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((issue) => new BountyItem(issue));
    }
    return [];
  }

  getParent(node: BountyNode): BountyNode | undefined {
    if (node instanceof BountyItem) {
      return new BountyGroup(node.issue.status, 0, vscode.TreeItemCollapsibleState.Expanded);
    }
    return undefined;
  }

  private collectAll(): BountyIssue[] {
    return Array.from(this.cache.values()).flat();
  }

  /**
   * Fetch all `zimb`-labelled issues from the current repo (across all states).
   */
  async loadAll(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const target = await this.issueCreator.resolveTargetRepo();
      const session = await this.auth.getSession();
      if (!session) {
        this.cache.set('error', []);
        return;
      }

      // We fetch all states (open + closed) — pagination via per_page=100
      const statuses: BountyStatus[] = ['open', 'closed'];
      const all: BountyIssue[] = [];

      for (const state of statuses) {
        const url = `https://api.github.com/repos/${target.owner}/${target.repo}/issues?state=${state}&labels=zimb&per_page=100`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${session.accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'zimb-vscode',
          },
        });
        if (!res.ok) continue;
        const issues = (await res.json()) as Array<{
          number: number;
          title: string;
          html_url: string;
          state: 'open' | 'closed';
          state_reason?: string | null;
          assignees: Array<{ login: string }>;
          created_at: string;
          updated_at: string;
          labels: Array<{ name: string }>;
          body: string | null;
          pull_request?: unknown;
        }>;
        for (const i of issues) {
          if (i.pull_request) continue; // skip PRs
          const hasAssignees = i.assignees.length > 0;
          const hasBountyLabel = i.labels.some((l) => l.name === 'bounty');
          if (!hasBountyLabel) continue;

          let status: BountyStatus;
          if (i.state === 'closed') status = 'closed';
          else if (hasAssignees) status = 'claimed';
          else if (i.state_reason === 'completed' || i.state_reason === 'not_planned')
            status = 'closed';
          else status = 'open';

          // Try to extract a bounty amount from the body, e.g. "Bounty: 30€"
          const m = /bounty[:\s]+(\d+)\s*€/i.exec(i.body ?? '');
          const bounty = m?.[1] ? parseInt(m[1], 10) : undefined;

          all.push({
            number: i.number,
            title: i.title,
            htmlUrl: i.html_url,
            status,
            assignees: i.assignees.map((a) => a.login),
            createdAt: i.created_at,
            updatedAt: i.updated_at,
            labels: i.labels.map((l) => l.name),
            body: i.body ?? '',
            ...(bounty !== undefined ? { bounty } : {}),
            owner: target.owner,
            repo: target.repo,
          });
        }
      }

      this.cache.set('issues', all);
    } finally {
      this.loading = false;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function labelFor(status: BountyStatus): string {
  switch (status) {
    case 'open': return '🟢 Open bounties';
    case 'claimed': return '🟡 Claimed';
    case 'delivered': return '🚀 Delivered';
    case 'closed': return '✅ Closed';
  }
}

function iconFor(status: BountyStatus | 'bounty'): vscode.ThemeIcon | undefined {
  if (status === 'bounty') return new vscode.ThemeIcon('issue-opened');
  switch (status) {
    case 'open': return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
    case 'claimed': return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.yellow'));
    case 'delivered': return new vscode.ThemeIcon('rocket', new vscode.ThemeColor('charts.blue'));
    case 'closed': return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.purple'));
  }
}

/**
 * Format an ISO date as a friendly relative time ("3h ago", "2d ago").
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}
