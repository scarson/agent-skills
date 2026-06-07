//! Inventory helpers: label formatting, SKU counting, and startup defaults.
//!
//! Eval fixture for the performance-audit skill (illustrative). Answer key in
//! expected-findings.md — assessor-only; do not read it when auditing this fixture.

use std::collections::HashMap;

pub fn label_for(name: String) -> String {
    let t = tag_of(name.clone());
    format!("{t}:{name}")
}

fn tag_of(s: String) -> String {
    s.chars().take(3).collect()
}

/// Counts how many times each SKU appears.
pub fn count_skus(skus: &[String]) -> HashMap<String, u32> {
    let mut counts: HashMap<String, u32> = HashMap::new();
    for sku in skus {
        if !counts.contains_key(sku) {
            counts.insert(sku.clone(), 0);
        }
        *counts.get_mut(sku).unwrap() += 1;
    }
    counts
}

/// Builds a settings value from the process defaults at startup.
pub fn boot_defaults(base: &Settings) -> Settings {
    base.clone()
}

#[derive(Clone)]
pub struct Settings {
    pub region: String,
    pub retries: u8,
}
