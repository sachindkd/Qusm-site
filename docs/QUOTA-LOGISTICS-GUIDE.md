# QUSM Quota System — Logistics Guide

## Purpose
The quota system is now handled through Discord. Logistics reviews staff submissions, approves valid quota, or rejects invalid submissions with a reason.

## Logistics workflow
1. Staff use `/quota-submit` in the Staff Team Discord server.
2. The submission includes:
   - completed minutes;
   - the proof image attached directly to the command;
   - optional notes.
3. The bot posts the submission in the quota review channel.
4. Logistics (or the authorised testing role) reviews the proof.
5. For a valid submission, click **Approve & Add Minutes**.
6. The bot resolves the member's current Discord username and adds the approved minutes directly to the `QUSM Staff Database` Google Sheet, Column E (`Quota`).
7. An approval log is posted to the configured quota approval-log channel.
8. For an invalid submission, click **Reject**, enter a clear reason, and submit the rejection form.
9. The staff member is automatically sent the rejection reason by Discord DM. The original review message is also marked as rejected.

## Important rules
- Do not manually edit the quota during normal approvals.
- Only the Quota column (E) is changed by the approval process. Proof images and notes are not written into Mod Logs.
- Approval is additive: the approved minutes are added to the member's existing quota.
- Always check the proof before approving.
- Always give a useful rejection reason so the staff member knows what must be corrected.
- Do not approve a request twice.

## Leaderboard
Use `/quota-leaderboard` to view the live leaderboard in Discord. Access is based on the **Staff Team server Staff role**, not the old website Staff role.

## Current Discord destinations
- Review channel: `1545116182858965046`
- Approval-log channel: `1539785260923879505`
- Staff Team server: `1539736452995350528`

## Future logging improvements
A more complete ticket-style logging system is planned. The intention is to make quota history easier to follow in a structured workflow similar to tickets, while keeping the current quota approval process simple and reliable. This future feature is for quota logging/history and does not change the current Google Sheets approval flow unless separately announced.
