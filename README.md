# Food Delivery Time & Customer Satisfaction Analytics 🚴📦

An end-to-end data science and machine learning platform designed to predict delivery duration and classify customer satisfaction risk in hyper-local on-demand food delivery networks.

Developed as a Data Science Capstone Project at **Vellore Institute of Technology (VIT)**.

---

## 🚀 Key Highlights & Architecture

- **Delivery Duration Forecasting:** Linear regression modeling capturing spatial distance, kitchen preparation bottleneck, courier rating, and ambient variables to predict actual delivery times.
- **Customer Satisfaction Risk Classifier:** Random Forest classification pipeline predicting risk of unsatisfactory customer experience ($\text{Rating} < 4.0$) before delivery completion.
- **Embedded REST API & Web Server:** Zero-dependency Python HTTP server (`server.py`) serving live prediction endpoints, model metrics, and dataset queries.
- **Interactive Dark Obsidian Dashboard:** Pure Vanilla HTML5/CSS3/JavaScript web interface with dynamic KPI cards, real-time prediction simulator, and interactive data explorer.
- **Comprehensive Data Pipeline:** Automated cleaning, IQR outlier clipping, and statistical evaluation scripts in both Python (`.ipynb`) and R (`.R`).

---

## 📁 Repository Structure

```
.
├── charts/                                  # High-resolution generated analytical plots
│   ├── 01_delivery_distribution.png
│   ├── 02_distance_delivery.png
│   ├── 03_delivery_rating.png
│   ├── 04_rating_by_delivery_band.png
│   └── 05_feature_importance.png
├── web/                                     # Web application front-end assets
│   ├── index.html                           # Semantic HTML5 user interface & simulator
│   ├── index.css                            # Glassmorphism dark aesthetic stylesheet
│   └── app.js                               # Interactive client logic & API bindings
├── Food_Delivery_Analytics_Presentation.pptx# Presentation slides
├── Food_Delivery_MidSem_Progress_Report.docx# Academic formal review report
├── Food_Delivery_MidSem_Review.ipynb        # Complete Data Science & ML pipeline notebook
├── Food_Delivery_MidSem_Review_PPT.pptx     # Mid-semester slide deck
├── R_Data_Analysis.R                        # R exploratory & regression analysis script
├── food_delivery_prototype_raw.csv          # Raw dataset (12,040 rows)
├── food_delivery_prototype_cleaned.csv      # Cleaned & IQR-clipped dataset (12,000 rows)
├── metrics.json                             # Benchmark statistical & ML metrics
├── server.py                                # Production-grade Python REST API & web server
├── PROJECT_DOCUMENTATION.md                 # Exhaustive system architecture & technical manual
└── README.md                                # Project overview and quick start guide
```

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/suyashjobanputra/Food-Delivery-DS-CP.git
cd Food-Delivery-DS-CP
```

### 2. Set Up Environment & Dependencies
```bash
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install pandas numpy scikit-learn matplotlib seaborn jupyter
```

### 3. Launch the Web Application
```bash
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your web browser.

---

## 📖 In-Depth Documentation

For the complete technical manual, feature breakdowns, mathematical formulas, and system design specifications, refer to [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md).
