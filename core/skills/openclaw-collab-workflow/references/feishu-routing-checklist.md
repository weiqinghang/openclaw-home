# Feishu Routing Checklist

Use when the task touches Feishu accounts, groups, mentions, allowlists, or message routing.

## Check

- separate permission, routing, session, and display layers
- confirm whether the issue is single-account or multi-account
- in multi-account mode, inspect account-level group config first
- confirm whether group reply requires mention or allows direct trigger

## Verify

- confirm group message permission and event subscription are correct
- confirm target group is allowed at the correct account scope
- confirm `requireMention` and `allowFrom` match the intended behavior
- if behavior still looks stale, inspect related session and dedup state

## Risks

- top-level Feishu config may hot reload but still not affect multi-account runtime
- missing group permission can look like prompt or routing failure
- reply may exist in transcript but not appear in main timeline

## Minimum Output

- failing layer
- account scope checked
- group policy result
- follow-up verification
