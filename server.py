import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
CHARTS_DIR = os.path.join(BASE_DIR, "charts")

# Load data and train models once on startup
print("[FoodPulse Server] Loading dataset and initializing ML models...")
df_clean = pd.read_csv(os.path.join(BASE_DIR, "food_delivery_prototype_cleaned.csv"))
df_clean["satisfaction"] = np.where(df_clean["customer_rating"] >= 4, "Satisfied", "Not Satisfied")

# Regression model
features_reg = [
    "distance_km", "preparation_time_min", "number_of_items",
    "restaurant_rating", "courier_rating", "estimated_delivery_min", "hour"
]
reg_model = LinearRegression()
reg_model.fit(df_clean[features_reg], df_clean["actual_delivery_min"])

# Classification model
features_clf = [
    "distance_km", "preparation_time_min", "traffic", "weather", "hour",
    "number_of_items", "order_value", "restaurant_rating",
    "courier_rating", "estimated_delivery_min"
]
num_features = [
    "distance_km", "preparation_time_min", "hour", "number_of_items",
    "order_value", "restaurant_rating", "courier_rating", "estimated_delivery_min"
]
cat_features = ["traffic", "weather"]

preprocessor = ColumnTransformer([
    ("num", SimpleImputer(strategy="median"), num_features),
    ("cat", OneHotEncoder(handle_unknown="ignore"), cat_features)
])

rf_model = RandomForestClassifier(
    n_estimators=100, max_depth=10, min_samples_leaf=3,
    class_weight="balanced", random_state=42
)
clf_pipeline = Pipeline([("prep", preprocessor), ("model", rf_model)])
clf_pipeline.fit(df_clean[features_clf], df_clean["satisfaction"])

# Load metrics.json
with open(os.path.join(BASE_DIR, "metrics.json"), "r") as f:
    project_metrics = json.load(f)

# Calculate additional summary metrics
satisfaction_rate = round(float((df_clean["satisfaction"] == "Satisfied").mean() * 100), 1)
project_metrics["satisfaction_rate_percent"] = satisfaction_rate
project_metrics["total_records"] = int(len(df_clean))

feature_names = clf_pipeline.named_steps["prep"].get_feature_names_out()
rf_importances = [
    {"feature": n.replace("num__", "").replace("cat__", ""), "importance": round(float(imp * 100), 2)}
    for n, imp in sorted(zip(feature_names, clf_pipeline.named_steps["model"].feature_importances_),
                         key=lambda x: x[1], reverse=True)
]

print(f"[FoodPulse Server] Models initialized successfully! Ready to serve on port 8000.")


class FoodDeliveryHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/metrics":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response_data = {
                "metrics": project_metrics,
                "feature_importances": rf_importances,
                "regression_coefficients": {
                    feat: round(float(coef), 4)
                    for feat, coef in zip(features_reg, reg_model.coef_)
                },
                "regression_intercept": round(float(reg_model.intercept_), 4)
            }
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
            return

        elif path == "/api/dataset":
            # Paginated dataset query
            page = int(query.get("page", ["1"])[0])
            page_size = int(query.get("page_size", ["15"])[0])
            satisfaction = query.get("satisfaction", [""])[0]
            traffic = query.get("traffic", [""])[0]
            weather = query.get("weather", [""])[0]
            search = query.get("search", [""])[0].strip().lower()

            filtered = df_clean
            if satisfaction:
                filtered = filtered[filtered["satisfaction"] == satisfaction]
            if traffic:
                filtered = filtered[filtered["traffic"] == traffic]
            if weather:
                filtered = filtered[filtered["weather"] == weather]
            if search:
                filtered = filtered[filtered["order_id"].str.lower().str.contains(search, na=False)]

            total_count = len(filtered)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            subset = filtered.iloc[start_idx:end_idx].copy()

            # Fill NaN for clean JSON conversion
            records = subset.fillna("N/A").to_dict(orient="records")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "records": records
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        elif path.startswith("/charts/"):
            # Serve chart images
            chart_file = os.path.basename(path)
            chart_path = os.path.join(CHARTS_DIR, chart_file)
            if os.path.exists(chart_path) and os.path.isfile(chart_path):
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                with open(chart_path, "rb") as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, f"Chart not found: {chart_file}")
                return

        # Serve static web app files
        if path == "/" or path == "/index.html":
            file_to_serve = os.path.join(WEB_DIR, "index.html")
            content_type = "text/html; charset=utf-8"
        elif path == "/index.css":
            file_to_serve = os.path.join(WEB_DIR, "index.css")
            content_type = "text/css; charset=utf-8"
        elif path == "/app.js":
            file_to_serve = os.path.join(WEB_DIR, "app.js")
            content_type = "application/javascript; charset=utf-8"
        else:
            # Check if file exists in WEB_DIR
            clean_path = path.lstrip("/")
            file_to_serve = os.path.join(WEB_DIR, clean_path)
            if clean_path.endswith(".js"):
                content_type = "application/javascript"
            elif clean_path.endswith(".css"):
                content_type = "text/css"
            elif clean_path.endswith(".svg"):
                content_type = "image/svg+xml"
            elif clean_path.endswith(".png"):
                content_type = "image/png"
            elif clean_path.endswith(".jpg"):
                content_type = "image/jpeg"
            else:
                content_type = "text/plain"

        if os.path.exists(file_to_serve) and os.path.isfile(file_to_serve):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            with open(file_to_serve, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"File not found: {path}")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/predict":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)

            # Extract features with defaults
            distance_km = float(data.get("distance_km", 5.0))
            prep_time = float(data.get("preparation_time_min", 20.0))
            traffic = str(data.get("traffic", "Medium"))
            weather = str(data.get("weather", "Clear"))
            hour = int(data.get("hour", 19))
            items = int(data.get("number_of_items", 2))
            order_val = float(data.get("order_value", 350.0))
            rest_rating = float(data.get("restaurant_rating", 4.2))
            courier_rating = float(data.get("courier_rating", 4.5))
            est_delivery = float(data.get("estimated_delivery_min", 40.0))

            # Linear regression input
            df_reg = pd.DataFrame([{
                "distance_km": distance_km,
                "preparation_time_min": prep_time,
                "number_of_items": items,
                "restaurant_rating": rest_rating,
                "courier_rating": courier_rating,
                "estimated_delivery_min": est_delivery,
                "hour": hour
            }])
            pred_delivery_min = float(reg_model.predict(df_reg[features_reg])[0])
            pred_delivery_min = max(10.0, round(pred_delivery_min, 1))

            # Classification input
            df_clf = pd.DataFrame([{
                "distance_km": distance_km,
                "preparation_time_min": prep_time,
                "traffic": traffic,
                "weather": weather,
                "hour": hour,
                "number_of_items": items,
                "order_value": order_val,
                "restaurant_rating": rest_rating,
                "courier_rating": courier_rating,
                "estimated_delivery_min": est_delivery
            }])
            satisfaction_pred = str(clf_pipeline.predict(df_clf[features_clf])[0])
            prob_classes = clf_pipeline.classes_.tolist()
            probas = clf_pipeline.predict_proba(df_clf[features_clf])[0].tolist()
            prob_dict = {cls: round(float(p), 4) for cls, p in zip(prob_classes, probas)}
            sat_prob = round(prob_dict.get("Satisfied", 0.5) * 100, 1)

            # Delay calculation
            delay_min = round(pred_delivery_min - est_delivery, 1)
            if delay_min > 12.0:
                delay_status = "Critical Delay Alert"
                delay_severity = "danger"
            elif delay_min > 4.0:
                delay_status = "Moderate Delay"
                delay_severity = "warning"
            elif delay_min < -3.0:
                delay_status = "Ahead of Schedule"
                delay_severity = "success"
            else:
                delay_status = "On Schedule"
                delay_severity = "info"

            # Recommendations based on data insights
            recommendations = []
            if weather == "Rain":
                recommendations.append("Monsoon advisory: Assign waterproof courier bags and allow +10 min customer buffer.")
            if traffic == "High":
                recommendations.append("Congestion alert: Suggest alternative two-wheeler corridor or surge bonus for fast transit.")
            if prep_time > 28:
                recommendations.append("Kitchen bottleneck: Notify restaurant partner to start packaging 5 minutes sooner.")
            if delay_min > 5:
                recommendations.append(f"Proactive CRM alert: Send automatic SMS notification apologizing for expected {int(delay_min)}m delay.")
            if rest_rating < 3.8:
                recommendations.append("Merchant quality flag: Low restaurant rating may compound customer dissatisfaction.")
            if not recommendations:
                recommendations.append("Operational parameters optimal: Standard delivery protocol on track.")

            response_data = {
                "predicted_delivery_min": pred_delivery_min,
                "confidence_interval": {
                    "low": max(5.0, round(pred_delivery_min - 3.32, 1)),
                    "high": round(pred_delivery_min + 3.32, 1)
                },
                "estimated_delivery_min": est_delivery,
                "delay_min": delay_min,
                "delay_status": delay_status,
                "delay_severity": delay_severity,
                "satisfaction": satisfaction_pred,
                "satisfaction_probability": sat_prob,
                "risk_level": "High Risk" if sat_prob < 45 else ("Medium Risk" if sat_prob < 70 else "Low Risk"),
                "recommendations": recommendations
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
        else:
            self.send_error(404, "Endpoint not found")


def run(port=8000):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, FoodDeliveryHandler)
    print(f"[FoodPulse Server] Server listening on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[FoodPulse Server] Shutting down gracefully.")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)
