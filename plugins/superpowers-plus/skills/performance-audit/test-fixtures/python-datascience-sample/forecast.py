"""Day-ahead load forecasting: a scikit-learn pipeline tuned by grid search, plus
per-meter scoring.

Eval fixture for the performance-audit skill (illustrative). Answer key in
expected-findings.md — assessor-only; do not read it when auditing this fixture.
"""

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GridSearchCV


def tune_load_model(X, y):
    """Grid-search a load-forecasting pipeline."""
    pipe = Pipeline([
        ("scale", StandardScaler()),
        ("pca", PCA(n_components=32)),
        ("model", HistGradientBoostingRegressor()),
    ])
    grid = {
        "model__max_depth": [3, 5, 7, 9],
        "model__learning_rate": [0.01, 0.05, 0.1],
    }
    search = GridSearchCV(pipe, grid, cv=5)
    search.fit(X, y)
    return search.best_estimator_


def score_all_meters(model, meter_rows):
    """Produce a forecast for every meter."""
    forecasts = []
    for row in meter_rows:
        yhat = model.predict([row])
        forecasts.append(yhat[0])
    return forecasts


class WeatherAdjuster:
    """Applies an expensive weather-normalization curve to a forecast."""

    def __init__(self, curve):
        self._curve = curve
        self._cache = {}

    def adjust(self, forecast, weather):
        """Weather-normalize a forecast, memoizing the expensive curve eval."""
        key = id(weather)
        if key in self._cache:
            return self._cache[key]
        result = self._eval_curve(forecast, weather)
        self._cache[key] = result
        return result

    def _eval_curve(self, forecast, weather):
        return forecast * self._curve.get(weather["band"], 1.0)
