# admin-study-catalyst
Here is your **complete, unified Backend Requirement Document (Admin Portal + Student Module + Membership + QR System)** — structured cleanly so your dev team can directly build from it.

---

# 📘 **Medical LMS Backend Requirement Document (Full System)**

### Admin Portal + Student Management + Learning + Exam + Membership System

---

## 1. 📌 System Overview

The system is a **Medical Learning Management System (LMS)** designed for students preparing for competitive exams (e.g., EMREE).

### Core Concept:

* Learning happens through **question-based progression**
* Each unit contains questions
* Students complete questions sequentially
* After completing a unit → student can attempt an exam
* Membership determines access (Normal vs Premium)

---

## 2. 👥 User Roles

### 2.1 Admin

* Full system control
* Content management
* Student management
* Membership & QR management
* Analytics & monitoring

### 2.2 Student

* Access learning content
* Attempt exams
* Upgrade membership

---

## 3. 🔐 Authentication Module

### Features:

* Login
* Forgot password
* Reset password

### Requirements:

* JWT-based authentication
* Password hashing (bcrypt)
* Role-based access control

### APIs:

* POST `/auth/login`
* POST `/auth/forgot-password`
* POST `/auth/reset-password`

---

## 4. 👤 User (Student) Module

---

### 4.1 User Table Structure

| Field               | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `id`                | Primary key                                          |
| `name`              | Required                                             |
| `email`             | Unique                                               |
| `phone`             | Optional                                             |
| `password`          | Hashed                                               |
| `role`              | `admin` / `student`                                  |
| `membership_type`   | `normal` / `premium`                                 |
| `membership_source` | `direct_registration` / `book_qr` / `manual_upgrade` |
| `book_code_id`      | Nullable FK                                          |
| `is_active`         | Boolean                                              |
| `created_at`        | Timestamp                                            |
| `updated_at`        | Timestamp                                            |

---

### 4.2 Registration Logic

#### Case 1: Direct Registration

* membership_type = `normal`
* membership_source = `direct_registration`

#### Case 2: QR/Book Code Registration

* Validate code
* membership_type = `premium`
* membership_source = `book_qr`
* Link code to user
* Mark code as used

---

### 4.3 Upgrade Membership Flow

#### API:

* POST `/student/upgrade-membership`

#### Logic:

* Validate book code
* If valid:

  * membership_type → `premium`
  * membership_source → `manual_upgrade`
  * link code
  * mark code as used

---

## 5. 🔑 Book QR / Code Module

---

### 5.1 Book Code Table

| Field             | Description                       |
| ----------------- | --------------------------------- |
| `id`              | Primary key                       |
| `code`            | Unique                            |
| `qr_url`          | QR image                          |
| `status`          | unused / used / expired / blocked |
| `used_by_user_id` | FK                                |
| `used_at`         | Timestamp                         |
| `expires_at`      | Optional                          |
| `created_at`      | Timestamp                         |

---

### 5.2 Admin Features

* Generate single code
* Bulk generate codes
* Export codes (for printing)
* Block/unblock codes
* Expire codes
* Track usage

---

## 6. 📘 Exam Type Module

---

### Table: `exam_types`

| Field                |
| -------------------- |
| id                   |
| exam_name (required) |
| tags                 |
| created_at           |
| updated_at           |

---

### Features:

* CRUD operations
* Search/filter

---

## 7. 📚 Unit Module

---

### Table: `units`

| Field                        |
| ---------------------------- |
| id                           |
| unit_name                    |
| image                        |
| exam_type_id                 |
| tags                         |
| access_type (free / premium) |
| created_at                   |
| updated_at                   |

---

### Features:

* CRUD
* Filter by exam type
* Upload image
* Access control

---

## 8. 🧠 Learning Questions Module

---

### Table: `questions`

| Field          |
| -------------- |
| id             |
| question       |
| option1        |
| option2        |
| option3        |
| option4        |
| correct_answer |
| description    |
| audio_file     |
| unit_id        |
| access_type    |
| created_at     |

---

### Features:

* CRUD
* Audio upload
* Rich text description
* Unit mapping

---

## 9. 🧪 Exam Question Bank Module

---

### Table: `exam_questions`

| Field                         |
| ----------------------------- |
| id                            |
| question                      |
| option1                       |
| option2                       |
| option3                       |
| option4                       |
| correct_answer                |
| short_description             |
| difficulty (easy/medium/hard) |
| unit_id                       |
| access_type (optional)        |
| created_at                    |

---

### Features:

* CRUD
* Filter by difficulty
* Filter by unit

---

## 10. 📖 Learning Progress Module

---

### Table: `student_question_progress`

| Field       |
| ----------- |
| id          |
| student_id  |
| question_id |
| status      |
| answered_at |

---

### Logic:

* Sequential unlocking
* Track completion per question

---

## 11. 🧪 Exam System

---

### 11.1 Exam Creation Logic

Student selects:

* Unit
* Difficulty

### Backend:

* Fetch questions from `exam_questions`
* Filter by unit + difficulty
* Randomize questions

---

### 11.2 Student Exams Table

| Field           |
| --------------- |
| id              |
| student_id      |
| unit_id         |
| difficulty      |
| score           |
| total_questions |
| correct_answers |
| status          |
| started_at      |
| submitted_at    |

---

### 11.3 Student Exam Answers Table

| Field           |
| --------------- |
| id              |
| exam_id         |
| question_id     |
| selected_answer |
| is_correct      |
| answered_at     |

---

### 11.4 Submission Logic

* Evaluate answers
* Calculate score
* Store results

---

## 12. 📊 Question Analytics Module

---

### Table: `question_statistics`

| Field            |
| ---------------- |
| question_id      |
| total_attempts   |
| correct_attempts |
| wrong_attempts   |

---

### Update Logic:

* Increment stats after each exam submission

---

### Difficulty Calculation (Optional):

```
accuracy = correct_attempts / total_attempts

> 0.8 → Easy  
0.5–0.8 → Medium  
< 0.5 → Hard
```

---

## 13. 📊 Admin Monitoring Modules

---

### 13.1 Student Management

* View all students
* Filter:

  * membership
  * source
* Block/unblock users
* Modify membership
* View exam history

---

### 13.2 Question Analytics

* Most attempted questions
* Most wrong questions
* Difficulty insights

---

### 13.3 Membership Analytics

* Total users
* Normal vs Premium
* QR registrations
* Manual upgrades
* Code usage stats

---

## 14. 🔐 Access Control System

---

### Based on `membership_type`

#### Normal Users:

* Limited access
* Restricted units/questions
* No exam access (optional rule)

#### Premium Users:

* Full access
* Exams enabled

---

### Backend Enforcement:

Every API must validate:

* User role
* Membership type
* Content access_type

---

## 15. 📁 File Management

---

### Supported Files:

* Unit images
* Question audio

### Requirements:

* Cloud storage (AWS S3 recommended)
* Store file URLs in DB
* Validate file size/type

---

## 16. 🔐 Security Requirements

* JWT authentication
* Role-based authorization
* Input validation
* Secure file uploads
* Unique secure book codes
* One-time code usage
* Expired/blocked code validation

---

## 17. ⚙️ API Structure (High-Level)

---

### Auth

* POST `/auth/login`
* POST `/auth/forgot-password`

---

### Admin

* CRUD `/exam-types`
* CRUD `/units`
* CRUD `/questions`
* CRUD `/exam-questions`
* CRUD `/book-codes`
* GET `/students`
* GET `/analytics`

---

### Student

* POST `/register`
* POST `/upgrade-membership`
* GET `/units`
* GET `/questions`
* POST `/exam/create`
* POST `/exam/submit`

---




