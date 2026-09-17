# GitHub App Organization Installation Guide

## 1. Overview

This document provides technical instructions for installing the `@zimb-bot` GitHub App on an organization account. It resolves the scenario where an app owner accesses Developer Settings, finds only an "Edit" button without an "Install" option, or cannot find their organization in the installation target list.

## 2. Root Cause Analysis

### 2.1 Index Page Display ("Edit" Button Only)
On GitHub, navigating to `Settings -> Developer settings -> GitHub Apps` displays a list of apps registered by the account. The action column on this index page exclusively exposes an **Edit** button. GitHub does not provide a direct "Install" button on the index table. Installation management is located within the application configuration page.

### 2.2 Installation Access Policy ("Where can this GitHub App be installed?")
When a GitHub App is created under a personal user account, GitHub defaults the installation access policy to **"Only on this account"**. Under this configuration:
- The app is restricted strictly to the user account that created it.
- Organizations do not appear in the "Install App" target list, even if the user is an owner of those organizations.
- Direct installation URLs (`https://github.com/apps/<app-slug>/installations/new`) reject organization selection.

### 2.3 Required Organization Permissions
To install any GitHub App on an organization, the executing user must hold one of the following roles:
- **Organization Owner**
- **GitHub App Manager** (assigned under `Organization Settings -> GitHub App Managers`)

Regular organization members do not have permission to install apps. They can only submit an installation request for an organization owner to review.

---

## 3. Resolution Procedures

### Method 1: Set App Installation Policy to "Any account" (Recommended)

This configuration allows the app to be installed on any account or organization where the user has administrative authority.

1. Sign in to GitHub with the account that owns the GitHub App.
2. Navigate to `Settings -> Developer settings -> GitHub Apps`.
3. Click **Edit** next to the target GitHub App.
4. On the **General** settings tab, scroll down to the section titled **"Where can this GitHub App be installed?"**.
5. Change the selection from **"Only on this account"** to **"Any account"**.
6. Click **Save changes**.
7. In the left navigation sidebar of the app settings page, click **Install App** (`https://github.com/settings/apps/<app-slug>/installations`).
8. The target organization will now appear in the list with a green **Install** button.
9. Click **Install** next to the organization.
10. Select repository access:
    - **All repositories** (recommended for full automation), or
    - **Only select repositories** (e.g., target repositories).
11. Click **Install & Authorize**.

---

### Method 2: Transfer App Ownership to the Organization

If the app should remain strictly internal to the organization rather than public:

1. Sign in to GitHub with the account that owns the GitHub App.
2. Navigate to `Settings -> Developer settings -> GitHub Apps`.
3. Click **Edit** next to the target GitHub App.
4. In the left navigation sidebar, click **Advanced**.
5. In the **"Transfer ownership"** section, enter the name of the target organization (e.g., `Zimb` or `zimb-app`).
6. Confirm the transfer by following GitHub's prompt.
7. Navigate to the organization's settings: `https://github.com/organizations/<org-name>/settings/apps/<app-slug>`.
8. In the left navigation sidebar, click **Install App**.
9. Click **Install** for the organization.
10. Select repository scope and finalize installation.

---

## 4. Role and Policy Requirements

| Requirement | Value / Setting | Impact |
|---|---|---|
| User Role in Target Organization | Organization Owner or GitHub App Manager | Regular members cannot install apps; only Owners/Managers can authorize. |
| App Installation Access Policy | "Any account" (or Org-owned) | "Only on this account" blocks all organizations from appearing in the install list. |
| Third-Party Application Access Restrictions | Configured in Org Settings | If the org restricts third-party integrations, an Owner must approve access. |
| Repository Permissions | Admin or Write | Required for granting webhook, contents, and collaborator management access. |

---

## 5. Direct Installation URLs

Once the app is set to "Any account" or owned by the organization, installation can be triggered directly via browser:

- **Public App Page:** `https://github.com/apps/<app-slug>` (click the green "Install" button)
- **Direct Install Flow:** `https://github.com/apps/<app-slug>/installations/new`
- **Targeted Organization Install:** `https://github.com/apps/<app-slug>/installations/new?target_id=<org-id>`

---

## 6. Post-Installation Verification Checklist

Execute these checks after installation to confirm operational status:

- [ ] Navigate to `https://github.com/organizations/<org-name>/settings/installations` (Organization Settings -> Third-party Access -> GitHub Apps). Confirm that the app appears in the "Installed GitHub Apps" list.
- [ ] Confirm repository access permissions ("All repositories" or designated target repositories).
- [ ] Verify webhook delivery: Check that the webhook URL is active and receiving ping events.
- [ ] Run the diagnostic verification script in the worker package:
  ```bash
  npm run verify:github:install -w @zimb/worker
  ```
