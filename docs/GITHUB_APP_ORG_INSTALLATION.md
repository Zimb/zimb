# GitHub App Organization Installation Guide

## 1. Overview

This document explains how to install the `@zimb-bot` GitHub App (or any GitHub App) on an organization account.

It resolves the issue where:
- The app owner navigates to `Developer settings -> GitHub Apps`, but only an **Edit** button is visible with no **Install** button.
- When opening the app's settings, target organizations do not appear in the installation target list.
- An organization owner cannot initiate or complete the installation flow for their organization.

---

## 2. Root Cause Analysis

### 2.1 Index Page Design ("Edit" Button Only)
On GitHub, navigating to `Settings -> Developer settings -> GitHub Apps` (`https://github.com/settings/apps`) displays the list of apps registered under that account.

The table on this index page **only provides an "Edit" button**. This is by design in GitHub's UI: installation management is located inside the app's settings pages, not on the index table.

### 2.2 Installation Access Policy ("Where can this GitHub App be installed?")
When a GitHub App is created under a personal user account, GitHub defaults the installation access policy to **"Only on this account"**.

Under this default setting:
- The app is strictly restricted to the creator's personal account.
- In the app's **Install App** menu, organizations are **not listed**, even if the user is an owner/administrator of those organizations.
- Direct installation links (`https://github.com/apps/<app-slug>/installations/new`) will refuse organization installation.

### 2.3 Required Organization Permissions
To install a GitHub App on an organization, the user must hold one of the following permissions:
- **Organization Owner**
- **GitHub App Manager** (a specialized role assigned under `Organization Settings -> GitHub App Managers`)

Users with regular member access cannot install GitHub Apps; they can only send an installation request for an organization owner to review.

---

## 3. Step-by-Step Resolution Procedures

### Method A: Set Installation Policy to "Any account" (Recommended)

This allows the app to be installed on any account or organization where the user has appropriate administrative rights.

1. Sign in to GitHub with the account that owns the GitHub App.
2. Navigate to: `Settings` → `Developer settings` → `GitHub Apps` (`https://github.com/settings/apps`).
3. Click the **Edit** button next to `@zimb-bot` (or your app).
4. On the **General** settings page, scroll down to **"Where can this GitHub App be installed?"**.
5. Change the option from **"Only on this account"** to **"Any account"**.
6. Click **Save changes** at the bottom of the page.
7. In the left sidebar navigation, click **Install App** (`https://github.com/settings/apps/<app-slug>/installations`).
8. You will now see your organizations listed with a green **Install** button next to each one.
9. Click **Install** next to the target organization (e.g. `Zimb-app` or `Zimb`).
10. Select repository permissions:
    - **All repositories** (recommended for full bot automation), or
    - **Only select repositories** (e.g. `Zimb/zimb`).
11. Click **Install & Authorize**.

---

### Method B: Transfer App Ownership to the Organization

If the app is intended solely for the organization rather than multi-tenant public usage, transferring ownership moves the app directly under the organization:

1. Sign in to GitHub with the account that owns the GitHub App.
2. Navigate to `Settings` → `Developer settings` → `GitHub Apps`.
3. Click **Edit** next to the app.
4. In the left navigation sidebar, click **Advanced**.
5. In the **Transfer ownership** section, enter the target organization's name (e.g., `Zimb-app`).
6. Confirm the transfer by following the GitHub prompt.
7. Navigate to the organization's settings: `https://github.com/organizations/<org-name>/settings/apps/<app-slug>`.
8. In the left sidebar, click **Install App**, select the organization, and complete installation.

---

## 4. Role and Policy Summary Matrix

| Requirement | Setting / Value | Why it's required |
|---|---|---|
| **App Installation Access Policy** | **"Any account"** (or Org-owned) | If set to "Only on this account", GitHub hides all organizations from the installation menu. |
| **User Role in Target Org** | **Organization Owner** or **GitHub App Manager** | Organization members cannot authorize GitHub Apps without admin delegation. |
| **Third-Party Application Restrictions** | Configured in Org Settings | If the organization enforces integration restrictions, an Owner must explicitly approve the app. |
| **Repository Scope** | All repositories OR designated repos | Grants the bot webhook and collaborator permissions on target repositories. |

---

## 5. Direct Installation URLs

Once the app's policy is set to **"Any account"** (or owned by the organization), you can initiate installation directly:

- **Public App Page:** `https://github.com/apps/<app-slug>` (click the green "Install" button)
- **Direct Install Flow:** `https://github.com/apps/<app-slug>/installations/new`
- **Target Organization Install:** `https://github.com/apps/<app-slug>/installations/new?target_id=<org-id>`

---

## 6. Post-Installation Verification Checklist

Verify that the installation was successful:

- [ ] **Organization Installed GitHub Apps List:**
  Navigate to `https://github.com/organizations/<org>/settings/installations` (Organization Settings → Third-party Access → Installed GitHub Apps).
  Confirm that the app appears in the "Installed GitHub Apps" list.
- [ ] **Repository Access:**
  Confirm that the expected repositories (or all repositories) are selected under the app's configuration.
- [ ] **Automated CLI Verification:**
  Run the verification script in the worker package:
  ```bash
  npm run verify:github:install -w @zimb/worker
  ```
  The script inspects the installation token, confirms organization-level installation, and validates repository permissions.
