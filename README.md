# PR Label Manager

A comprehensive GitHub Action that automatically manages PR labels and status based on various events and conditions. This action provides intelligent labeling for the entire PR lifecycle from draft to production deployment.

## Features

### 🏷️ Automatic Label Management

- **Draft PRs**: Automatically adds `Status: Draft` for draft pull requests
- **Feature Classification**: Detects and labels `Feature: Base` and `Feature: Part` PRs
- **Branch-Based Labels**: Auto-detects `hotfix/`, `fix/`, and `rc/` branches with appropriate labels
- **Content-Based Labels**: Intelligently detects breaking changes, documentation, refactoring, performance, and security changes
- **Review Status**: Manages `Code review: In progress`, `Code review: Request Changes`, and `Code review: Approved` labels
- **Deployment Tracking**: Tracks staging and production deployments with appropriate labels
- **Conflict Detection**: Monitors and labels PRs with merge conflicts
- **Lifecycle Management**: Handles merged, abandoned, and ready-for-review states
- **Command-Based Labels**: Responds to comment commands like `!action_required`, `!urgent`, `!breaking`, `!security`

### 🔄 Event-Driven Automation

- **Pull Request Events**: Responds to opened, closed, synchronized, and draft conversion events
- **Review Events**: Handles review submissions, approvals, and change requests
- **Push Events**: Tracks deployments to staging and production branches
- **Scheduled Checks**: Periodic monitoring for abandoned PRs and merge conflicts

### 🎨 Smart Label Creation

- **Auto-Creation**: Automatically creates missing labels with appropriate colors
- **Color Coding**: Uses semantic colors for different label types
- **Consistent Naming**: Enforces consistent label naming across repositories

## Usage

### Basic Setup

Create a workflow file (e.g., `.github/workflows/pr-manager.yml`) in your repository:

```yaml
name: PR Label Manager

on:
  pull_request:
    types: [opened, closed, converted_to_draft, ready_for_review, synchronize]
  pull_request_review:
    types: [submitted, dismissed]
  issue_comment:
    types: [created]
  push:
    branches: [main, staging]
  schedule:
    # Run every hour to check for abandoned PRs and merge conflicts
    - cron: '0 * * * *'

jobs:
  pr-manager:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
      checks: read
    steps:
      - name: Manage PR Labels
        uses: filipemacedo/pr-manager@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          stagingBranch: 'staging'
          productionBranch: 'main'
          abandonedTimeout: '30'
          checkConflicts: 'true'
          conflictCheckInterval: '60'
          teamId: 'Organization/Team-Name'
```

### Advanced Configuration

```yaml
name: PR Label Manager

on:
  pull_request:
    types: [opened, closed, converted_to_draft, ready_for_review, synchronize]
  pull_request_review:
    types: [submitted, dismissed]
  push:
    branches: [main, develop, staging]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  pr-manager:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
      checks: read
    steps:
      - name: Manage PR Labels
        uses: filipemacedo/pr-manager@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          stagingBranch: 'staging'
          productionBranch: 'main'
          abandonedTimeout: '14'  # Mark as abandoned after 14 days
          checkConflicts: 'true'
          conflictCheckInterval: '30'  # Check conflicts every 30 minutes
          teamId: 'Organization/Team-Name'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `token` | GitHub token for API access | Yes | - |
| `stagingBranch` | Name of the staging branch | No | `staging` |
| `productionBranch` | Name of the production branch | No | `main` |
| `abandonedTimeout` | Days of inactivity before marking PR as abandoned | No | `30` |
| `checkConflicts` | Whether to check for merge conflicts | No | `true` |
| `conflictCheckInterval` | Minutes between merge conflict checks | No | `60` |
| `teamId` | Team ID for global notifications (e.g., Organization/Team-Name) | No | - |

## Label System

### Status Labels

- `Status: Draft` - Pull request is still being worked on
- `Status: Ready for review` - Ready for code review
- `Status: Ready for Staging` - Pull request is ready to be deployed to the staging environment for testing
- `Status: Merged` - Pull request has been merged
- `Status: Abandoned` - Closed without being merged

### Code Review Labels

- `Code review: In progress` - Review is ongoing and not yet finalized
- `Code review: Request Changes` - Reviewers have requested changes before merging
- `Code review: Approved` - All reviewers have approved the changes

### Feature Labels

- `Feature: Base` - Establishes the initial structure or foundation for a new feature
- `Feature: Part` - Implements a specific part of a larger feature

### Deployment Labels

- `Deployed: Staging` - Pull request has been deployed to the staging environment for testing
- `Deployed: Production` - Pull request has been deployed to the production environment

### Fix Labels

- `Fix: Hotfix` - Urgent production fix applied directly to the main branch
- `Fix: Bug` - Fixes a functional bug or error

### Type Labels

- `Type: Breaking Change` - Contains breaking changes that may affect existing functionality
- `Type: Documentation` - Pull requests that update documentation, README files, or code comments
- `Type: Refactor` - Code refactoring without changing functionality
- `Type: Performance` - Improves performance, optimization, or efficiency
- `Type: Security` - Addresses security vulnerabilities or implements security improvements

### Priority Labels

- `Priority: Urgent` - Requires immediate attention and priority handling

### Merge Block Labels

- `Merge Block: Action Required` - Signifies that action or changes are required before this pull request can be merged

### Other Labels

- `Merge Conflict` - Indicates that this pull request has merge conflicts that must be resolved before merging

## Workflow Events

### Pull Request Events

#### `opened`

- Adds `Status: Draft` for draft PRs
- Adds `Status: Ready for review` for regular PRs
- Checks for feature base/part classification

#### `converted_to_draft`

- Removes `Status: Ready for review`
- Adds `Status: Draft`

#### `ready_for_review`

- Removes `Status: Draft`
- Adds `Status: Ready for review`

#### `synchronize`

- Removes `Code review: Request Changes`
- Adds `Status: Ready for review`
- Notifies reviewers of new commits

#### `closed`

- Adds `Status: Merged` if PR was merged

### Pull Request Review Events

#### `submitted` (changes_requested)

- Removes `Status: Ready for review` and `Code review: In progress`
- Adds `Code review: Request Changes`

#### `submitted` (approved)

- Adds `Code review: Approved`
- Adds `Status: Ready for Staging`

#### `submitted` (commented)

- Adds `Code review: In progress`

#### `dismissed`

- Removes review-related labels

### Push Events

#### Staging Branch Push

- Removes `Status: Ready for Staging`
- Adds `Deployed: Staging`

#### Production Branch Push

- Removes `Status: Ready for Staging`
- Adds `Deployed: Production`
- Notifies PR authors

### Scheduled Events

#### Abandoned PR Check

- Adds `Status: Abandoned` for PRs inactive beyond timeout
- Notifies PR authors

#### Merge Conflict Check

- Adds/removes `Merge Conflict` label based on PR status

### Issue Comment Events

#### Comment Commands

- `!action_required` - Adds `Merge Block: Action Required` label and notifies team
- `!urgent` - Adds `Priority: Urgent` label
- `!breaking` - Adds `Type: Breaking Change` label
- `!security` - Adds `Type: Security` label

## Permissions

The action requires the following permissions:

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
  checks: read
  pull-requests: write  # Required for dismissing reviews
```

## Examples

### Basic Repository Setup

```yaml
name: PR Label Manager

on:
  pull_request:
  pull_request_review:
  push:
    branches: [main, staging]

jobs:
  pr-manager:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
      checks: read
    steps:
      - name: Manage PR Labels
        uses: your-username/pr-manager@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Enterprise Repository with Custom Branches

```yaml
name: PR Label Manager

on:
  pull_request:
  pull_request_review:
  push:
    branches: [master, develop, staging]

jobs:
  pr-manager:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
      checks: read
    steps:
      - name: Manage PR Labels
        uses: your-username/pr-manager@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          stagingBranch: 'staging'
          productionBranch: 'master'
          abandonedTimeout: '21'
```

## Troubleshooting

### Common Issues

1. **Labels not being created**: Ensure the token has `issues: write` permission
2. **Review events not triggering**: Make sure the workflow includes `pull_request_review` events
3. **Scheduled checks not running**: Verify the cron schedule is valid and the repository has activity

### Debugging

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository settings.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/filipemacedo/pr-manager/issues) page.
