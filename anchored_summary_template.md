# anchored_summary_template.md

Template for generating condensed session summaries from historical conversations.

## How to Use

Fill this template with data from a completed session to create a historical record that can be queried later.

## Template Structure

### Session ID
`[YYYY-MM-DD-session-X]` - Unique session identifier with date

### Objective
What was the main goal of this session?

### Important Details
Key facts, findings, or decisions made during the session.

### Work State
- **Completed**: What was finished
- **Active**: What was in progress
- **Blocked**: What was blocked and why
- **Pending**: What needs follow-up

### Next Move
The immediate next step required.

### Relevant Files
- Path to created/modified files
- Path to files referenced

## Example Entry

```
## Session 2026-11-05-session-1

### Objective
Implement the user authentication flow for the API.

### Important Details
- Chose JWT over session cookies for stateless auth
- Redis used for token blacklist

### Work State
- **Completed**: User model with password hashing
- **Active**: Implementing login endpoint
- **Blocked**: None

### Next Move
Implement token refresh endpoint

### Relevant Files
- `src/models/User.ts`
- `src/routes/auth.ts`
```