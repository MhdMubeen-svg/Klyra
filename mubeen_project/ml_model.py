"""
Klyra — ML Prediction Module
Decision Tree & Random Forest classifiers for student performance prediction.
"""

import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

# ═══════════════════════════════════════════
# TRAINING DATA
# Features: [attendance, internal_marks, study_hours, arrears]
# Labels:   Basic / Intermediate / Advanced
# ═══════════════════════════════════════════
X_train = np.array([
    # ── Advanced students ──
    [95, 92, 14, 0],
    [98, 88, 12, 0],
    [90, 85, 10, 0],
    [92, 90, 13, 0],
    [88, 82, 11, 0],
    [96, 95, 15, 0],
    [93, 87, 12, 0],
    [91, 84, 10, 0],
    [89, 80, 9, 0],
    [94, 91, 14, 0],
    [97, 93, 13, 0],
    [85, 80, 10, 0],

    # ── Intermediate students ──
    [75, 65, 7, 0],
    [70, 60, 6, 1],
    [78, 70, 8, 0],
    [72, 62, 5, 0],
    [68, 58, 6, 1],
    [80, 72, 8, 0],
    [74, 66, 7, 0],
    [65, 55, 5, 1],
    [77, 68, 7, 0],
    [73, 63, 6, 0],
    [69, 59, 5, 1],
    [76, 67, 8, 0],

    # ── Basic students ──
    [50, 35, 2, 3],
    [45, 30, 1, 4],
    [55, 40, 3, 2],
    [40, 25, 1, 5],
    [60, 45, 3, 2],
    [48, 32, 2, 3],
    [52, 38, 2, 2],
    [35, 20, 1, 6],
    [58, 42, 3, 1],
    [42, 28, 1, 4],
    [53, 36, 2, 3],
    [47, 33, 2, 4],
])

y_train = np.array([
    # Advanced
    'Advanced', 'Advanced', 'Advanced', 'Advanced', 'Advanced', 'Advanced',
    'Advanced', 'Advanced', 'Advanced', 'Advanced', 'Advanced', 'Advanced',
    # Intermediate
    'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate',
    'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate',
    'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate',
    # Basic
    'Basic', 'Basic', 'Basic', 'Basic', 'Basic', 'Basic',
    'Basic', 'Basic', 'Basic', 'Basic', 'Basic', 'Basic',
])

# ═══════════════════════════════════════════
# TRAIN MODELS
# ═══════════════════════════════════════════
dt_model = DecisionTreeClassifier(random_state=42, max_depth=5)
dt_model.fit(X_train, y_train)

rf_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
rf_model.fit(X_train, y_train)

print("[OK] ML models trained successfully (Decision Tree + Random Forest)")


def predict_student(attendance: int, internal: int, study_hours: int, arrears: int) -> dict:
    """
    Predict student performance level using both ML models.

    Args:
        attendance:  0–100  (percentage)
        internal:    0–100  (marks)
        study_hours: 0–16   (daily hours)
        arrears:     0+     (count)

    Returns:
        dict with 'dt_prediction' and 'rf_prediction'
        each being 'Basic', 'Intermediate', or 'Advanced'
    """
    features = np.array([[attendance, internal, study_hours, arrears]])

    dt_pred = dt_model.predict(features)[0]
    rf_pred = rf_model.predict(features)[0]

    return {
        'dt_prediction': dt_pred,
        'rf_prediction': rf_pred,
    }
