# Expected Viva Questions & Answers
## Project: Klyra (Student Performance Prediction & Management System)

Here is a comprehensive list of likely viva questions for your final-year or semester project, categorized by topic to help you prepare.

---

### 1. Project Overview & Objectives
**Q: What is the main objective of your project "Klyra"?**
**A:** The main objective is to provide a platform that not only tracks and manages student academic data but also predicts their overall performance level (Basic, Intermediate, Advanced) using Machine Learning algorithms based on parameters like attendance, internal marks, study hours, and arrears. It also includes an activity-based scoring system (sports, internships).

**Q: Why did you choose this specific topic?**
**A:** Because traditional student management systems only record data. Klyra adds predictive analytics (Decision Tree & Random Forest) to proactively identify students who might need extra help, allowing educators to intervene early.

**Q: What are the key features of your application?**
**A:** 
- Secure User Authentication (Teacher/Admin login).
- Comprehensive student profile creation (academics + extracurriculars).
- Dynamic weighted scoring system.
- Dual ML predictions (Decision Tree and Random Forest).
- Fully responsive, modern, and mobile-friendly UI.

---

### 2. Machine Learning & Algorithms
**Q: Which Machine Learning algorithms did you use and why?**
**A:** I used two prominent supervised learning classification algorithms from `scikit-learn`: **Decision Tree Classifier** and **Random Forest Classifier**. 
- Decision Tree is easy to interpret and fast.
- Random Forest (an ensemble of decision trees) was used to provide a more robust and accurate prediction by reducing overfitting. 

**Q: What are the input features (independent variables) for your ML model?**
**A:** The model takes 4 features: 
1. Attendance (Percentage) 
2. Internal Marks (Normalized out of 100) 
3. Study Hours (Daily) 
4. Number of Arrears

**Q: What is the output (dependent variable) of your ML model?**
**A:** The output is a categorical label predicting the student's performance level: **Basic**, **Intermediate**, or **Advanced**.

**Q: How is the model integrated into your web application?**
**A:** The models are trained in a separate Python module (`ml_model.py`) using `scikit-learn`. When the Flask backend receives a new student's data via the `/api/students` POST route, it calls the `predict_student()` function, passing the features. The generated predictions are then stored in the SQLite database and returned to the frontend.

---

### 3. Backend (Python & Flask)
**Q: Why did you choose Flask for the backend?**
**A:** Flask is a lightweight, flexible, and micro web framework in Python. Since the ML models are built in Python (using scikit-learn), Flask makes it incredibly seamless to integrate the ML scripts with the web API without the heavy overhead of a larger framework like Django.

**Q: How are passwords secured in your application?**
**A:** Passwords are never stored in plain text. I used `werkzeug.security` to generate password hashes (`generate_password_hash`) before storing them in the database, and `check_password_hash` to verify them during login.

**Q: Is your application using a RESTful API?**
**A:** Yes. The frontend communicates with the backend using RESTful principles, specifically utilizing endpoints like `POST /api/students` for adding data and `DELETE /api/students/<id>` for removing records, exchanging data in JSON format.

---

### 4. Database (SQLite)
**Q: What database are you using, and why?**
**A:** I am using **SQLite**. It maps directly to a single file (`mubeen.db`) which is lightweight, serverless, and perfect for small-to-medium scale applications. It removes the need for complex database server configuration while still supporting standard SQL queries.

**Q: What tables exist in your database?**
**A:** There are two main tables:
1. `users` (Stores teachers/admins with hashed passwords).
2. `students` (Stores all student academic data, scores, and the ML predictions linked to a `user_id` via a Foreign Key).

**Q: How did you handle schema changes, like when you added ML predictions to an existing database?**
**A:** I wrote a simple migration script in `app.py` that checks the table schema using `PRAGMA table_info(students)`. If the columns `dt_prediction` and `rf_prediction` don't exist, it uses `ALTER TABLE` to append them without dropping existing student data.

---

### 5. Frontend & UI Design
**Q: What technologies were used for the frontend?**
**A:** Pure HTML, CSS (with modern CSS variables, flexbox, grid, and media queries), and Vanilla JavaScript for DOM manipulation and asynchronous API calls (using the `fetch` API).

**Q: How did you ensure the application is responsive on mobile devices?**
**A:** I used CSS media queries (`@media`) with specific breakpoints (768px for tablets, 600px/480px for mobile phones). Depending on the screen width, grids collapse into single columns, fonts resize, and navigation layouts adapt to be touch-friendly. 

**Q: How are you managing state on the frontend?**
**A:** State is maintained primarily in memory via JavaScript arrays (for the student list) and variables (to track the current step in the multi-step form). When the page reloads, the state is re-fetched asynchronously (`loadInitialData()`), ensuring the UI stays in sync with the backend.

---

### 6. General Questions / Challenges
**Q: What was the most challenging part of this project?**
**A:** *(Your personal answer)* Example: Merging the multi-step frontend form dynamically with the Python ML models over an API, ensuring data formats like integers matched perfectly before passing them to the Random Forest model.

**Q: How does this project benefit educational institutions?**
**A:** It shifts the focus from purely *recording* grades to *analyzing* them. By factoring in holistic data like extracurriculars, study hours, and predicting future performance, counselors and teachers can identify at-risk students immediately instead of waiting for end-of-semester results.

**Q: If you had more time, what future enhancements would you make?**
**A:** 
- Connecting to a larger relational database like PostgreSQL for scalability.
- Training the ML models on a massive real-world historical dataset.
- Exporting reports as PDF/Excel for staff.
- Adding a student-facing portal where they can log in to view their performance tips.
