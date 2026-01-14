# 📝 To-Do List Web Application

A simple, clean, and practical **To-Do List** web application built with **Vanilla JavaScript**, focusing on clarity, usability, and local data persistence.

---

## 📌 Features

- ➕ Add new tasks with validation
- ✏️ Edit existing tasks using a modal
- 🗑️ Delete:
  - Single task
  - All tasks
  - Completed tasks only
- ✅ Mark tasks as completed / uncompleted
- 🔍 Filter tasks:
  - All
  - Completed
  - To-Do
- 💾 Persistent storage using **LocalStorage**
- 🛡️ Basic protection against HTML injection (XSS)
- 📱 Simple and responsive structure

---

## 🧠 Core Concepts Used

- DOM Manipulation
- Event Handling
- LocalStorage (JSON)
- Modular & readable JavaScript structure
- Modal-based UI interactions
- Input validation & error handling

---

## 🗂️ Project Structure

TO-DO-LIST/
│
├── index.html # Main HTML structure
├── style.css # Styling and layout
├── script.js # Application logic (JavaScript)
└── README.md # Project documentation


---

## ⚙️ How It Works (High Level)

1. Tasks are stored as objects:
   ```js
   { id, name, done }
