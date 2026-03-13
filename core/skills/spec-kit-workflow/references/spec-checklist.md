# Spec-kit Checklist

## Official commands

- Check CLI: `specify --help`
- Bootstrap current repo carefully: `specify init`
- Review generated templates before adopting them into an existing repo

## Minimum spec fields

- Goal
- Problem
- Users or operators
- In scope
- Out of scope
- Main flow
- Edge cases
- Acceptance
- Risks
- Open questions

## Slice rule

Each slice must:

- deliver observable value
- have a single owner
- be testable on its own
- avoid hidden cross-slice dependencies

## Exit criteria

Spec-kit is done when:

- scope is stable enough to plan
- acceptance can be tested
- unknowns are either resolved or isolated
