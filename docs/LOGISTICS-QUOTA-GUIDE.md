# QUSM Quota System — Logistics Guide

## Purpose
The quota system is the official workflow for reviewing Staff quota submissions. Staff submit their completed minutes and proof through Discord. Logistics verifies the submission and decides whether to approve or reject it.

## Logistics workflow
1. Go to the Staff Team Discord server.
2. Watch the quota review channel for new **Quota Submission — Pending Review** posts.
3. Check the staff member, submitted minutes, proof image, and optional notes.
4. If the proof and quota are valid, click **Approve & Add Minutes**.
5. The approved minutes are added directly to the QUSM Staff Database in Google Sheets, to the staff member's existing quota total.
6. The submission message is marked **Approved** and an approval log is posted in the configured quota approval-log channel.
7. If the submission is invalid, click **Reject**, enter a clear reason, and submit the rejection form.
8. The staff member receives the rejection reason by Discord DM, the original submission is marked **Rejected**, and a **Quota Rejected** record is posted in the same quota approval-log channel.

## Important
- Do not manually edit the quota amount for an approved submission unless specifically correcting an administrative error.
- Approval adds minutes; it does not replace the existing quota total.
- Proof must be reviewed before approval.
- A rejection reason is required so the staff member knows what must be corrected.
- Rejected submissions do **not** add minutes to the Google Staff Database.
- The approval and rejection records use the same configured quota log channel so the complete decision history stays together.
- The quota leaderboard is Discord-only. Use `/quota-leaderboard` and the Staff Team server staff role to view it.
- Staff submit quota with `/quota-submit`, including minutes and the proof image. Notes are optional.

## Current logging scope
The current system is specifically for **quota logging**: submission, review, approval/rejection, Google Sheets update, and the related Discord records.

A broader logging feature is planned for later, with a workflow similar to tickets/log cases. That future system may cover other staff actions and records, but it is separate from the current quota workflow.

## Role responsibilities
**Logistics:** review submissions, approve valid quota, reject invalid quota with a reason, and ensure the review process is completed.

**Staff:** submit accurate quota and valid proof and follow the required logging process described in the Staff Guide.
