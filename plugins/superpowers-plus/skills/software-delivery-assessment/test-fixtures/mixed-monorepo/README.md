# Mixed Monorepo

This repository contains three delivery units: a reusable library, a containerized service, and a scheduled job. Workflow `shared-delivery-v2` governs all three, but each unit has its own trigger, verification boundary, and release consequence.

The library examples contrast permissive and behavior-validating doubles, bounded and masking retries, and weak and behavior-validating assertions. Context facts are maintained separately from the assessed source.
