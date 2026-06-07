//! HTTP handlers for an axum + tokio + sqlx service: application state, order
//! lookup, metrics recording, and a dashboard endpoint.
//!
//! Eval fixture for the performance-audit skill (illustrative). Answer key in
//! expected-findings.md — assessor-only; do not read it when auditing this fixture.

use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub catalog: Vec<Product>,
    pub pool: sqlx::PgPool,
}

pub async fn order_handler(state: AppState, ids: Vec<i64>) -> Vec<Row> {
    let mut rows = Vec::new();
    for id in &ids {
        let row = sqlx::query_as::<_, Row>("SELECT id, name FROM items WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .unwrap();
        rows.push(row);
    }
    rows
}

pub async fn record_metric(counter: Arc<Mutex<u64>>, db: &sqlx::PgPool) {
    let mut guard = counter.lock().unwrap();
    *guard += 1;
    sqlx::query("INSERT INTO metrics(n) VALUES ($1)")
        .bind(*guard as i64)
        .execute(db)
        .await
        .unwrap();
}

pub async fn dashboard(state: &AppState) -> (Summary, Summary) {
    let revenue = fetch_revenue(&state.pool).await;
    let refunds = fetch_refunds(&state.pool).await;
    (revenue, refunds)
}

pub struct Config;
#[derive(Clone)]
pub struct Product;
pub struct Row;
pub struct Summary;
async fn fetch_revenue(_p: &sqlx::PgPool) -> Summary { Summary }
async fn fetch_refunds(_p: &sqlx::PgPool) -> Summary { Summary }
