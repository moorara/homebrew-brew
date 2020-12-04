// Remote repository
// TODO: get owner and repo automatically
const OWNER = 'moorara'
const REPO = 'homebrew-brew'

// Git configurations
const GIT_USER_NAME = 'github-actions[bot]'
const GIT_USERE_EMAIL = 'github-actions[bot]@users.noreply.github.com'

// Pull request configuration
const REMOTE_NAME = 'origin'
const BRANCH_NAME = 'automated-update-formulas'
const COMMIT_MESSAGE = '[AUTOMATED] Update Formulas'
const PULL_REQUEST_TITLE = '[AUTOMATED] Update Formulas'
const PULL_REQUEST_USER = 'github-actions[bot]'

module.exports = {
  owner: OWNER,
  repo: REPO,

  gitUserName: GIT_USER_NAME,
  gitUserEmail: GIT_USERE_EMAIL,

  remoteName: REMOTE_NAME,
  branchName: BRANCH_NAME,
  commitMessage: COMMIT_MESSAGE,
  pullRequestTitle: PULL_REQUEST_TITLE,
  pullRequestUser: PULL_REQUEST_USER
}
