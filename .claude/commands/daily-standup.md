Run a daily standup for VidyaAI. Do the following:

1. Run `git log --oneline -10` to see recent commits
2. Run `git status` to see current working state
3. Check which session branch is currently active
4. Look at CLAUDE.md Build Order section to identify what session we are on

Then report:
- **Done:** what was completed (from git log)
- **In progress:** what is on the current branch but not yet committed
- **Next 3 tasks:** the next prompts to run from the current session plan
- **Blockers:** any failing tests, TypeScript errors, or missing env vars

Keep it brief — bullet points only.
