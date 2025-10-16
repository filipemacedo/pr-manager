const core = require('@actions/core');
const github = require('@actions/github');

// Label definitions
const LABELS = {
  DRAFT: 'Status: Draft',
  READY_FOR_REVIEW: 'Status: Ready for review',
  REQUEST_CHANGES: 'Code review: Request Changes',
  IN_PROGRESS: 'Code review: In progress',
  APPROVED: 'Code review: Approved',
  READY_FOR_STAGING: 'Status: Ready for Staging',
  DEPLOYED_STAGING: 'Deployed: Staging',
  DEPLOYED_PRODUCTION: 'Deployed: Production',
  MERGE_CONFLICT: 'Merge Conflict',
  MERGED: 'Status: Merged',
  ABANDONED: 'Status: Abandoned',
  FEATURE_BASE: 'Feature: Base',
  FEATURE_PART: 'Feature: Part',
  FIX_HOTFIX: 'Fix: Hotfix',
  FIX_BUG: 'Fix: Bug',
  MERGE_BLOCK_ACTION_REQUIRED: 'Merge Block: Action Required',
  URGENT: 'Priority: Urgent',
  BREAKING_CHANGE: 'Type: Breaking Change',
  DOCUMENTATION: 'Type: Documentation',
  REFACTOR: 'Type: Refactor',
  PERFORMANCE: 'Type: Performance',
  SECURITY: 'Type: Security',
};

const LABEL_COLORS = {
  [LABELS.DRAFT]: 'f9d71c',
  [LABELS.READY_FOR_REVIEW]: '0e8a16',
  [LABELS.REQUEST_CHANGES]: 'd73a49',
  [LABELS.IN_PROGRESS]: 'fbca04',
  [LABELS.APPROVED]: '0e8a16',
  [LABELS.READY_FOR_STAGING]: '1d76db',
  [LABELS.DEPLOYED_STAGING]: '7057ff',
  [LABELS.DEPLOYED_PRODUCTION]: '28a745',
  [LABELS.MERGE_CONFLICT]: 'd73a49',
  [LABELS.MERGED]: '6f42c1',
  [LABELS.ABANDONED]: '6a737d',
  [LABELS.FEATURE_BASE]: '0075ca',
  [LABELS.FEATURE_PART]: '0075ca',
  [LABELS.FIX_HOTFIX]: 'd73a49',
  [LABELS.FIX_BUG]: 'ff6b6b',
  [LABELS.MERGE_BLOCK_ACTION_REQUIRED]: 'b60205',
  [LABELS.URGENT]: 'ff0000',
  [LABELS.BREAKING_CHANGE]: 'b60205',
  [LABELS.DOCUMENTATION]: '0075ca',
  [LABELS.REFACTOR]: '7057ff',
  [LABELS.PERFORMANCE]: '00d4aa',
  [LABELS.SECURITY]: 'ff6b6b',
};

// Label descriptions for automatic creation
const LABEL_DESCRIPTIONS = {
  [LABELS.DRAFT]: 'Pull request is still being worked on.',
  [LABELS.READY_FOR_REVIEW]: 'Ready for code review.',
  [LABELS.REQUEST_CHANGES]: 'Reviewers have requested changes before merging.',
  [LABELS.IN_PROGRESS]: 'Review is ongoing and not yet finalized.',
  [LABELS.APPROVED]: 'All reviewers have approved the changes.',
  [LABELS.READY_FOR_STAGING]:
    'Pull request is ready to be deployed to the staging environment for testing.',
  [LABELS.DEPLOYED_STAGING]:
    'Pull request has been deployed to the staging environment for testing.',
  [LABELS.DEPLOYED_PRODUCTION]: 'Pull request has been deployed to the production environment.',
  [LABELS.MERGE_CONFLICT]:
    'Indicates that this pull request has merge conflicts that must be resolved before merging.',
  [LABELS.MERGED]: 'Pull request has been merged.',
  [LABELS.ABANDONED]: 'Closed without being merged.',
  [LABELS.FEATURE_BASE]: 'Establishes the initial structure or foundation for a new feature.',
  [LABELS.FEATURE_PART]: 'Implements a specific part of a larger feature.',
  [LABELS.FIX_HOTFIX]: 'Urgent production fix applied directly to the main branch.',
  [LABELS.FIX_BUG]: 'Fixes a functional bug or error.',
  [LABELS.MERGE_BLOCK_ACTION_REQUIRED]:
    'Signifies that action or changes are required before this pull request can be merged.',
  [LABELS.URGENT]: 'Requires immediate attention and priority handling.',
  [LABELS.BREAKING_CHANGE]: 'Contains breaking changes that may affect existing functionality.',
  [LABELS.DOCUMENTATION]:
    'Pull requests that update documentation, README files, or code comments.',
  [LABELS.REFACTOR]: 'Code refactoring without changing functionality.',
  [LABELS.PERFORMANCE]: 'Improves performance, optimization, or efficiency.',
  [LABELS.SECURITY]: 'Addresses security vulnerabilities or implements security improvements.',
};

class PRLabelManager {
  constructor() {
    this.octokit = github.getOctokit(core.getInput('token'));
    this.context = github.context;
    this.stagingBranch = core.getInput('stagingBranch') || 'staging';
    this.productionBranch = core.getInput('productionBranch') || 'main';
    this.abandonedTimeout = parseInt(core.getInput('abandonedTimeout') || '30');
    this.checkConflicts = core.getInput('checkConflicts') === 'true';
    this.conflictCheckInterval = parseInt(core.getInput('conflictCheckInterval') || '60');
    this.teamId = core.getInput('teamId') || '';
  }

  async run() {
    try {
      const eventName = this.context.eventName;
      console.log(`Processing event: ${eventName}`);

      switch (eventName) {
        case 'pull_request':
          await this.handlePullRequestEvent();
          break;
        case 'pull_request_review':
          await this.handlePullRequestReviewEvent();
          break;
        case 'push':
          await this.handlePushEvent();
          break;
        case 'schedule':
          await this.handleScheduledEvent();
          break;
        case 'issue_comment':
          await this.handleIssueCommentEvent();
          break;
        default:
          console.log(`Event ${eventName} not supported`);
      }
    } catch (error) {
      core.setFailed(`Action failed: ${error.message}`);
    }
  }

  async handlePullRequestEvent() {
    const { action, pull_request, changes } = this.context.payload;
    const pr = pull_request;

    console.log(`Processing PR ${action} for #${pr.number}`);

    switch (action) {
      case 'opened':
        await this.handlePROpened(pr);
        break;
      case 'synchronize':
        await this.handlePRSynchronize(pr);
        break;
      case 'closed':
        await this.handlePRClosed(pr);
        break;
      case 'converted_to_draft':
        await this.handlePRConvertedToDraft(pr);
        break;
      case 'ready_for_review':
        await this.handlePRReadyForReview(pr);
        break;
      case 'edited':
        await this.handlePREdited(pr, changes);
        break;
    }
  }

  async handlePullRequestReviewEvent() {
    const { action, pull_request, review } = this.context.payload;
    const pr = pull_request;

    console.log(`Processing review ${action} for PR #${pr.number}`);

    switch (action) {
      case 'submitted':
        if (review.state === 'changes_requested') {
          await this.handleRequestChanges(pr);
        } else if (review.state === 'approved') {
          await this.handleApproval(pr);
        } else if (review.state === 'commented') {
          await this.handleReviewInProgress(pr);
        }
        break;
      case 'dismissed':
        await this.handleReviewDismissed(pr);
        break;
    }
  }

  async handlePushEvent() {
    const { ref, commits } = this.context.payload;
    const branchName = ref.replace('refs/heads/', '');

    console.log(`Processing push to ${branchName}`);
    console.log(`Commits payload:`, JSON.stringify(commits, null, 2));

    if (branchName === this.stagingBranch) {
      await this.handleStagingDeployment(commits);
    } else if (branchName === this.productionBranch) {
      await this.handleProductionDeployment(commits);
    }
  }

  async handleScheduledEvent() {
    console.log('Running scheduled checks...');
    await this.checkAbandonedPRs();
    if (this.checkConflicts) {
      await this.checkMergeConflicts();
    }
  }

  async handleIssueCommentEvent() {
    const { action, issue, comment } = this.context.payload;

    if (!issue.pull_request) {
      return;
    }

    console.log(`Processing comment ${action} on PR #${issue.number}`);

    if (action === 'created') {
      const commentBody = comment.body.toLowerCase();

      if (commentBody.includes('!action_required')) {
        await this.addLabel(issue.number, LABELS.MERGE_BLOCK_ACTION_REQUIRED);

        if (this.teamId) {
          await this.notifyTeam(issue.number, 'action_required', comment.user.login);
        }
      }

      if (commentBody.includes('!urgent')) {
        await this.addLabel(issue.number, LABELS.URGENT);
      }

      if (commentBody.includes('!breaking')) {
        await this.addLabel(issue.number, LABELS.BREAKING_CHANGE);
      }

      if (commentBody.includes('!security')) {
        await this.addLabel(issue.number, LABELS.SECURITY);
      }
    }
  }

  async handlePROpened(pr) {
    if (pr.draft) {
      await this.addLabel(pr.number, LABELS.DRAFT);
    } else {
      await this.addLabel(pr.number, LABELS.READY_FOR_REVIEW);
    }

    await this.checkFeatureLabels(pr);

    await this.checkBranchLabels(pr);

    await this.checkContentLabels(pr);
  }

  async handlePRSynchronize(pr) {
    console.log(`PR #${pr.number} synchronized - checking for previous approvals...`);

    const hadApproval = await this.checkExistingApproval(pr.number);

    if (hadApproval) {
      console.log(
        `PR #${pr.number} had previous approval, removing approval labels and requesting re-review`
      );

      await this.removeLabel(pr.number, LABELS.APPROVED);
      await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
      await this.removeLabel(pr.number, LABELS.DEPLOYED_STAGING);
      await this.removeLabel(pr.number, LABELS.DEPLOYED_PRODUCTION);

      await this.addLabel(pr.number, LABELS.READY_FOR_REVIEW);

      await this.notifyApproversForReReview(pr);
    } else {
      console.log(`PR #${pr.number} had no previous approval, normal flow`);

      await this.removeLabel(pr.number, LABELS.REQUEST_CHANGES);
      await this.addLabel(pr.number, LABELS.READY_FOR_REVIEW);
      await this.notifyReviewers(pr);
    }
  }

  async handlePRClosed(pr) {
    if (pr.merged) {
      await this.addLabel(pr.number, LABELS.MERGED);
    }
  }

  async handlePRConvertedToDraft(pr) {
    await this.removeLabel(pr.number, LABELS.READY_FOR_REVIEW);
    await this.addLabel(pr.number, LABELS.DRAFT);
  }

  async handlePRReadyForReview(pr) {
    const hasApproval = await this.checkExistingApproval(pr.number);
    if (hasApproval) {
      await this.removeLabel(pr.number, LABELS.DRAFT);
      await this.addLabel(pr.number, LABELS.APPROVED);
      await this.addLabel(pr.number, LABELS.READY_FOR_STAGING);
    } else {
      await this.removeLabel(pr.number, LABELS.DRAFT);
      await this.addLabel(pr.number, LABELS.READY_FOR_REVIEW);
    }
  }

  async handlePREdited(pr, changes) {
    if (changes && changes.title) {
      console.log('PR title edited, revalidating content-based labels...');
      await this.validateContentLabels(pr);
    }
  }

  async handleRequestChanges(pr) {
    await this.removeLabel(pr.number, LABELS.READY_FOR_REVIEW);
    await this.removeLabel(pr.number, LABELS.IN_PROGRESS);
    await this.removeLabel(pr.number, LABELS.APPROVED);
    await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
    await this.addLabel(pr.number, LABELS.REQUEST_CHANGES);
  }

  async handleReviewInProgress(pr) {
    await this.addLabel(pr.number, LABELS.IN_PROGRESS);
  }

  async handleApproval(pr) {
    await this.removeLabel(pr.number, LABELS.READY_FOR_REVIEW);
    await this.removeLabel(pr.number, LABELS.REQUEST_CHANGES);
    await this.removeLabel(pr.number, LABELS.IN_PROGRESS);
    await this.addLabel(pr.number, LABELS.APPROVED);
    await this.addLabel(pr.number, LABELS.READY_FOR_STAGING);
  }

  async handleReviewDismissed(pr) {
    await this.removeLabel(pr.number, LABELS.REQUEST_CHANGES);
    await this.removeLabel(pr.number, LABELS.IN_PROGRESS);
  }

  async checkFeatureLabels(pr) {
    const title = pr.title.toLowerCase();

    if (title.includes('base')) {
      await this.addLabel(pr.number, LABELS.FEATURE_BASE);
    }

    const targetBranch = pr.base.ref;
    const targetPR = await this.findPRByBranch(targetBranch);

    if (targetPR && targetPR.title.toLowerCase().includes('base')) {
      await this.addLabel(pr.number, LABELS.FEATURE_PART);
    }
  }

  async checkBranchLabels(pr) {
    const branchName = pr.head.ref.toLowerCase();

    if (branchName.startsWith('hotfix/')) {
      await this.addLabel(pr.number, LABELS.FIX_HOTFIX);
      await this.addLabel(pr.number, LABELS.URGENT);
    }

    if (branchName.startsWith('fix/')) {
      await this.addLabel(pr.number, LABELS.FIX_BUG);
    }

    if (branchName.startsWith('rc/')) {
      await this.addLabel(pr.number, LABELS.READY_FOR_STAGING);
    }
  }

  async checkContentLabels(pr) {
    const title = pr.title.toLowerCase();
    const body = (pr.body || '').toLowerCase();
    const combinedText = `${title} ${body}`;

    if (
      combinedText.includes('breaking change') ||
      combinedText.includes('breaking:') ||
      combinedText.includes('[breaking]')
    ) {
      await this.addLabel(pr.number, LABELS.BREAKING_CHANGE);
    }

    if (
      combinedText.includes('docs:') ||
      combinedText.includes('documentation') ||
      combinedText.includes('readme') ||
      combinedText.includes('doc/')
    ) {
      await this.addLabel(pr.number, LABELS.DOCUMENTATION);
    }

    if (
      combinedText.includes('refactor:') ||
      combinedText.includes('refactoring') ||
      combinedText.includes('cleanup') ||
      combinedText.includes('restructure')
    ) {
      await this.addLabel(pr.number, LABELS.REFACTOR);
    }

    if (
      combinedText.includes('perf:') ||
      combinedText.includes('performance') ||
      combinedText.includes('optimize') ||
      combinedText.includes('optimization')
    ) {
      await this.addLabel(pr.number, LABELS.PERFORMANCE);
    }

    if (
      combinedText.includes('security:') ||
      combinedText.includes('security') ||
      combinedText.includes('vulnerability') ||
      combinedText.includes('cve-') ||
      combinedText.includes('auth') ||
      combinedText.includes('permission')
    ) {
      await this.addLabel(pr.number, LABELS.SECURITY);
    }

    if (
      combinedText.includes('urgent') ||
      combinedText.includes('asap') ||
      combinedText.includes('critical') ||
      combinedText.includes('emergency')
    ) {
      await this.addLabel(pr.number, LABELS.URGENT);
    }
  }

  async validateContentLabels(pr) {
    const { data: currentLabels } = await this.octokit.rest.issues.listLabelsOnIssue({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      issue_number: pr.number,
    });

    const currentLabelNames = currentLabels.map(label => label.name);

    const contentBasedLabels = [
      LABELS.BREAKING_CHANGE,
      LABELS.DOCUMENTATION,
      LABELS.REFACTOR,
      LABELS.PERFORMANCE,
      LABELS.SECURITY,
      LABELS.URGENT,
    ];

    for (const labelName of contentBasedLabels) {
      if (currentLabelNames.includes(labelName)) {
        const shouldHaveLabel = await this.shouldHaveContentLabel(pr, labelName);
        if (!shouldHaveLabel) {
          await this.removeLabel(pr.number, labelName);
        }
      }
    }

    await this.checkContentLabels(pr);
  }

  async shouldHaveContentLabel(pr, labelName) {
    const title = pr.title.toLowerCase();
    const body = (pr.body || '').toLowerCase();
    const combinedText = `${title} ${body}`;

    switch (labelName) {
      case LABELS.BREAKING_CHANGE:
        return (
          combinedText.includes('breaking change') ||
          combinedText.includes('breaking:') ||
          combinedText.includes('[breaking]')
        );
      case LABELS.DOCUMENTATION:
        return (
          combinedText.includes('docs:') ||
          combinedText.includes('documentation') ||
          combinedText.includes('readme') ||
          combinedText.includes('doc/')
        );
      case LABELS.REFACTOR:
        return (
          combinedText.includes('refactor:') ||
          combinedText.includes('refactoring') ||
          combinedText.includes('cleanup') ||
          combinedText.includes('restructure')
        );
      case LABELS.PERFORMANCE:
        return (
          combinedText.includes('perf:') ||
          combinedText.includes('performance') ||
          combinedText.includes('optimize') ||
          combinedText.includes('optimization')
        );
      case LABELS.SECURITY:
        return (
          combinedText.includes('security:') ||
          combinedText.includes('security') ||
          combinedText.includes('vulnerability') ||
          combinedText.includes('cve-') ||
          combinedText.includes('auth') ||
          combinedText.includes('permission')
        );
      case LABELS.URGENT:
        return (
          combinedText.includes('urgent') ||
          combinedText.includes('asap') ||
          combinedText.includes('critical') ||
          combinedText.includes('emergency')
        );
      default:
        return false;
    }
  }

  async checkExistingApproval(prNumber) {
    try {
      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        pull_number: prNumber,
      });

      return reviews.some(review => review.state === 'APPROVED');
    } catch (error) {
      console.error('Error checking existing approval:', error);
      return false;
    }
  }

  async findPRByBranch(branchName) {
    try {
      const { data: prs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        head: `${this.context.repo.owner}:${branchName}`,
        state: 'open',
      });

      return prs.length > 0 ? prs[0] : null;
    } catch (error) {
      console.log(`Error finding PR for branch ${branchName}: ${error.message}`);
      return null;
    }
  }

  async findPRsByBranchName(branchName) {
    try {
      const { data: openPRs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'open',
        head: `${this.context.repo.owner}:${branchName}`,
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: closedPRs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'closed',
        head: `${this.context.repo.owner}:${branchName}`,
        sort: 'updated',
        direction: 'desc',
        per_page: 10,
      });

      const mergedPRs = closedPRs.filter(
        pr => pr.merged_at && new Date(pr.merged_at) > thirtyDaysAgo
      );

      return [...openPRs, ...mergedPRs];
    } catch (error) {
      console.log(`Error finding PRs for branch ${branchName}: ${error.message}`);
      return [];
    }
  }

  async handleStagingDeployment(commits) {
    console.log('Handling staging deployment...');

    if (!commits || !Array.isArray(commits)) {
      console.log('No commits found in payload');
      return;
    }

    for (const commit of commits) {
      const commitSha = commit.sha || commit.id || 'unknown';
      const commitMessage = commit.message || 'No message';

      console.log(`Processing commit: ${commitSha} - ${commitMessage}`);

      if (commitSha && commitSha !== 'unknown') {
        const prs = await this.findPRsByCommit(commitSha);
        console.log(`Found ${prs.length} PRs by commit SHA`);

        for (const pr of prs) {
          console.log(`Adding deployed staging label to PR #${pr.number} (${pr.title})`);
          await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
          await this.addLabel(pr.number, LABELS.DEPLOYED_STAGING);
        }
      } else {
        console.log('Skipping commit SHA search - no valid SHA found');
      }

      if (
        commitMessage.includes('Merge pull request') ||
        commitMessage.includes('Merge branch') ||
        commitMessage.includes('Merge remote-tracking branch')
      ) {
        console.log('Commit appears to be a merge, checking commit message...');
        const prsByMessage = await this.findPRsByCommitMessage(commitMessage);
        console.log(`Found ${prsByMessage.length} PRs by commit message`);

        for (const pr of prsByMessage) {
          console.log(
            `Adding deployed staging label to PR #${pr.number} (${pr.title}) via message`
          );
          await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
          await this.addLabel(pr.number, LABELS.DEPLOYED_STAGING);
        }
      }
    }
  }

  async handleProductionDeployment(commits) {
    console.log('Handling production deployment...');

    if (!commits || !Array.isArray(commits)) {
      console.log('No commits found in payload');
      return;
    }

    for (const commit of commits) {
      const commitSha = commit.sha || commit.id || 'unknown';
      const commitMessage = commit.message || 'No message';

      console.log(`Processing commit: ${commitSha} - ${commitMessage}`);

      if (commitSha && commitSha !== 'unknown') {
        const prs = await this.findPRsByCommit(commitSha);
        console.log(`Found ${prs.length} PRs by commit SHA`);

        for (const pr of prs) {
          console.log(`Adding deployed production label to PR #${pr.number} (${pr.title})`);
          await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
          await this.removeLabel(pr.number, LABELS.DEPLOYED_STAGING);
          await this.addLabel(pr.number, LABELS.DEPLOYED_PRODUCTION);

          await this.notifyPRAuthor(pr);

          if (this.teamId) {
            await this.notifyTeam(pr.number, 'production');
          }
        }
      } else {
        console.log('Skipping commit SHA search - no valid SHA found');
      }

      if (
        commitMessage.includes('Merge pull request') ||
        commitMessage.includes('Merge branch') ||
        commitMessage.includes('Merge remote-tracking branch')
      ) {
        console.log('Commit appears to be a merge, checking commit message...');
        const prsByMessage = await this.findPRsByCommitMessage(commitMessage);
        console.log(`Found ${prsByMessage.length} PRs by commit message`);

        for (const pr of prsByMessage) {
          console.log(
            `Adding deployed production label to PR #${pr.number} (${pr.title}) via message`
          );
          await this.removeLabel(pr.number, LABELS.READY_FOR_STAGING);
          await this.removeLabel(pr.number, LABELS.DEPLOYED_STAGING);
          await this.addLabel(pr.number, LABELS.DEPLOYED_PRODUCTION);

          await this.notifyPRAuthor(pr);

          if (this.teamId) {
            await this.notifyTeam(pr.number, 'production');
          }
        }
      }
    }
  }

  async findPRsByCommit(commitSha) {
    try {
      try {
        const { data: commit } = await this.octokit.rest.repos.getCommit({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          ref: commitSha,
        });

        if (commit.pull_requests && commit.pull_requests.length > 0) {
          const prs = [];
          for (const prRef of commit.pull_requests) {
            try {
              const { data: pr } = await this.octokit.rest.pulls.get({
                owner: this.context.repo.owner,
                repo: this.context.repo.repo,
                pull_number: prRef.number,
              });
              prs.push(pr);
            } catch (error) {
              console.log(`Error fetching PR #${prRef.number}: ${error.message}`);
            }
          }
          return prs;
        }
      } catch (error) {
        console.log(`Error getting commit details: ${error.message}`);
      }

      const { data: prs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
      });

      const matchingPRs = [];

      for (const pr of prs) {
        try {
          const { data: commits } = await this.octokit.rest.pulls.listCommits({
            owner: this.context.repo.owner,
            repo: this.context.repo.repo,
            pull_number: pr.number,
            per_page: 100,
          });

          if (commits.some(commit => commit.sha === commitSha)) {
            matchingPRs.push(pr);
          }
        } catch (error) {
          console.log(`Error checking commits for PR #${pr.number}: ${error.message}`);
        }
      }

      return matchingPRs;
    } catch (error) {
      console.log(`Error finding PRs by commit: ${error.message}`);
      return [];
    }
  }

  async findPRsByCommitMessage(commitMessage) {
    try {
      console.log(`Analyzing commit message: ${commitMessage}`);

      const prMatch = commitMessage.match(/Merge pull request #(\d+)/);
      if (prMatch) {
        const prNumber = parseInt(prMatch[1]);
        console.log(`Found PR number in commit message: #${prNumber}`);

        try {
          const { data: pr } = await this.octokit.rest.pulls.get({
            owner: this.context.repo.owner,
            repo: this.context.repo.repo,
            pull_number: prNumber,
          });

          if (pr.state === 'closed' && pr.merged_at) {
            console.log(`PR #${prNumber} was merged, including in results`);
            return [pr];
          } else {
            console.log(`PR #${prNumber} is not merged, skipping`);
            return [];
          }
        } catch (error) {
          console.log(`Error fetching PR #${prNumber}: ${error.message}`);
          return [];
        }
      }

      const branchMatch = commitMessage.match(/Merge branch '([^']+)'/);
      if (branchMatch) {
        const branchName = branchMatch[1];
        console.log(`Found branch name in commit message: ${branchName}`);

        const prs = await this.findPRsByBranchName(branchName);
        console.log(`Found ${prs.length} PRs for branch ${branchName}`);
        return prs;
      }

      const autoMergeMatch = commitMessage.match(/Auto-merge of #(\d+)/);
      if (autoMergeMatch) {
        const prNumber = parseInt(autoMergeMatch[1]);
        console.log(`Found auto-merge PR number: #${prNumber}`);

        try {
          const { data: pr } = await this.octokit.rest.pulls.get({
            owner: this.context.repo.owner,
            repo: this.context.repo.repo,
            pull_number: prNumber,
          });

          if (pr.state === 'closed' && pr.merged_at) {
            return [pr];
          }
        } catch (error) {
          console.log(`Error fetching auto-merge PR #${prNumber}: ${error.message}`);
        }
      }

      console.log('No PR patterns found in commit message');
      return [];
    } catch (error) {
      console.log(`Error finding PRs by commit message: ${error.message}`);
      return [];
    }
  }

  async checkAbandonedPRs() {
    try {
      const { data: prs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'open',
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.abandonedTimeout);

      for (const pr of prs) {
        const lastActivity = new Date(pr.updated_at);

        if (lastActivity < cutoffDate) {
          await this.addLabel(pr.number, LABELS.ABANDONED);
          await this.notifyPRAuthor(pr, 'abandoned');
        }
      }
    } catch (error) {
      console.log(`Error checking abandoned PRs: ${error.message}`);
    }
  }

  async checkMergeConflicts() {
    try {
      const { data: prs } = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'open',
      });

      for (const pr of prs) {
        const { data: prData } = await this.octokit.rest.pulls.get({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          pull_number: pr.number,
        });

        if (prData.mergeable === false) {
          await this.addLabel(pr.number, LABELS.MERGE_CONFLICT);
        } else {
          await this.removeLabel(pr.number, LABELS.MERGE_CONFLICT);
        }
      }
    } catch (error) {
      console.log(`Error checking merge conflicts: ${error.message}`);
    }
  }

  async addLabel(prNumber, labelName) {
    try {
      await this.ensureLabelExists(labelName);

      await this.octokit.rest.issues.addLabels({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: prNumber,
        labels: [labelName],
      });

      console.log(`Added label "${labelName}" to PR #${prNumber}`);
    } catch (error) {
      console.log(`Error adding label "${labelName}" to PR #${prNumber}: ${error.message}`);
    }
  }

  async removeLabel(prNumber, labelName) {
    try {
      await this.octokit.rest.issues.removeLabel({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: prNumber,
        name: labelName,
      });

      console.log(`Removed label "${labelName}" from PR #${prNumber}`);
    } catch (error) {
      console.log(`Error removing label "${labelName}" from PR #${prNumber}: ${error.message}`);
    }
  }

  async ensureLabelExists(labelName) {
    try {
      await this.octokit.rest.issues.getLabel({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        name: labelName,
      });
    } catch (error) {
      if (error.status === 404) {
        const color = LABEL_COLORS[labelName] || '000000';
        const description = LABEL_DESCRIPTIONS[labelName] || `Auto-generated label: ${labelName}`;

        await this.octokit.rest.issues.createLabel({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          name: labelName,
          color,
          description,
        });

        console.log(
          `Created label "${labelName}" with color ${color} and description: ${description}`
        );
      } else {
        throw error;
      }
    }
  }

  async notifyReviewers(pr) {
    try {
      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        pull_number: pr.number,
      });

      const reviewers = [...new Set(reviews.map(review => review.user.login))];

      if (reviewers.length > 0) {
        const comment = `@${reviewers.join(' @')} New commits have been pushed. Please review the changes.`;

        await this.octokit.rest.issues.createComment({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: pr.number,
          body: comment,
        });
      }
    } catch (error) {
      console.log(`Error notifying reviewers: ${error.message}`);
    }
  }

  async notifyApproversForReReview(pr) {
    try {
      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        pull_number: pr.number,
      });

      const approvedReviews = reviews.filter(
        review => review.state === 'APPROVED' && !review.dismissed_at
      );

      const approvers = approvedReviews.map(review => review.user.login);
      const uniqueApprovers = [...new Set(approvers)];

      if (uniqueApprovers.length > 0) {
        for (const review of approvedReviews) {
          try {
            await this.octokit.rest.pulls.dismissReview({
              owner: this.context.repo.owner,
              repo: this.context.repo.repo,
              pull_number: pr.number,
              review_id: review.id,
              message: 'Dismissed due to new commits - re-review required',
            });
          } catch (error) {
            try {
              await this.octokit.rest.pulls.requestReviewers({
                owner: this.context.repo.owner,
                repo: this.context.repo.repo,
                pull_number: pr.number,
                reviewers: [review.user.login],
              });
            } catch (requestError) {
              console.log(
                `Error re-requesting review from ${review.user.login}: ${requestError.message}`
              );
            }
          }
        }

        try {
          await this.octokit.rest.pulls.requestReviewers({
            owner: this.context.repo.owner,
            repo: this.context.repo.repo,
            pull_number: pr.number,
            reviewers: uniqueApprovers,
          });
        } catch (error) {
          console.log(`Error re-requesting reviews: ${error.message}`);
        }

        const comment = `🔄 **Re-review Required**\n\n@${uniqueApprovers.join(' @')} \n\nNew commits have been pushed after your approval. Please review the changes and re-approve if everything looks good.\n\n**Previous approvals have been dismissed due to new changes.**`;

        await this.octokit.rest.issues.createComment({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: pr.number,
          body: comment,
        });
      }
    } catch (error) {
      console.log(`Error notifying approvers for re-review: ${error.message}`);
    }
  }

  async notifyPRAuthor(pr, type = 'production') {
    try {
      let message = '';

      if (type === 'production') {
        message = `🎉 Your PR #${pr.number} has been deployed to production!`;
      } else if (type === 'abandoned') {
        message = `⚠️ Your PR #${pr.number} has been inactive for ${this.abandonedTimeout} days and has been marked as abandoned. Please review and either update or close it.`;
      }

      if (message) {
        await this.octokit.rest.issues.createComment({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: pr.number,
          body: message,
        });
      }
    } catch (error) {
      console.log(`Error notifying PR author: ${error.message}`);
    }
  }

  async notifyTeam(prNumber, type, commenter) {
    try {
      if (!this.teamId) {
        return;
      }

      let message = '';

      switch (type) {
        case 'action_required':
          message = `🚨 **Action Required** - @${this.teamId}\n\n@${commenter} has flagged this PR as requiring action. Please review and take necessary steps.`;
          break;
        case 'urgent':
          message = `⚡ **Urgent** - @${this.teamId}\n\nThis PR has been marked as urgent and requires immediate attention.`;
          break;
        case 'breaking':
          message = `💥 **Breaking Change** - @${this.teamId}\n\nThis PR contains breaking changes that may affect other systems.`;
          break;
        case 'security':
          message = `🔒 **Security** - @${this.teamId}\n\nThis PR contains security-related changes that require careful review.`;
          break;
        case 'production':
          message = `🚀 **Production Deployment** - @${this.teamId}\n\nPR #${prNumber} has been deployed to production.`;
          break;
        default:
          message = `📢 **Notification** - @${this.teamId}\n\nUpdate regarding PR #${prNumber}.`;
      }

      if (message) {
        await this.octokit.rest.issues.createComment({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          issue_number: prNumber,
          body: message,
        });
      }
    } catch (error) {
      console.log(`Error notifying team: ${error.message}`);
    }
  }
}

const manager = new PRLabelManager();
manager.run();
