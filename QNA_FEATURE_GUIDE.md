# 📚 QNA (Question & Answer) Forum Feature

## Overview

A **forum-style QNA system** has been added to CampusOne, allowing students, teachers, and TAs to ask and answer questions within each course. This promotes collaborative learning and reduces repeated questions.

---

## 🎯 Feature Highlights

✅ **Course-Specific Forums** - Each course has its own QNA section  
✅ **Ask Questions** - Students/Teachers/TAs can post questions with attachments  
✅ **Answer Questions** - Anyone enrolled in the course can answer  
✅ **Upvote/Downvote** - Community voting on helpful answers  
✅ **Accept Best Answer** - Question asker or teacher can mark the best answer  
✅ **Pin Important Q&A** - Teachers can pin important discussions  
✅ **Search & Filter** - Find questions by keywords, tags, or status  
✅ **Attachments** - Upload images, PDFs, code files with questions/answers  
✅ **View Counter** - Track question popularity  
✅ **Tags System** - Organize questions by topics  
✅ **Notifications** - Get notified when your question is answered  

---

## 📊 Database Schema

### QNA Model
```javascript
{
  _id: ObjectId,
  courseId: ObjectId (ref: 'Course'),
  askedBy: ObjectId (ref: 'User'),
  question: String (min: 10 chars, required),
  description: String (optional, detailed body),
  tags: [String], // e.g., ['lecture-5', 'arrays', 'midterm']
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String
  }],
  answers: [{
    answeredBy: ObjectId (ref: 'User'),
    answer: String (required),
    attachments: [{ fileName, fileUrl, fileType }],
    isAccepted: Boolean (default: false),
    upvotes: [ObjectId], // Users who upvoted
    downvotes: [ObjectId], // Users who downvoted
    answeredAt: Date
  }],
  views: Number (default: 0),
  isResolved: Boolean (default: false),
  isPinned: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Backend API Endpoints

### Question Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/courses/:courseId/qna` | Enrolled Users | Ask a new question |
| GET | `/api/courses/:courseId/qna` | Enrolled Users | Get all questions for course |
| GET | `/api/qna/:id` | Enrolled Users | Get single question (increments views) |
| PUT | `/api/qna/:id` | Question Asker | Edit question (within 24 hours) |
| DELETE | `/api/qna/:id` | Question Asker/Teacher/Admin | Delete question |
| PUT | `/api/qna/:id/pin` | Teacher Only | Pin/Unpin question |
| GET | `/api/courses/:courseId/qna/search?q=term` | Enrolled Users | Search questions |

### Answer Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/qna/:id/answer` | Enrolled Users | Add an answer |
| PUT | `/api/qna/:questionId/answer/:answerId` | Answer Author | Edit answer |
| DELETE | `/api/qna/:questionId/answer/:answerId` | Answer Author/Teacher/Admin | Delete answer |
| PUT | `/api/qna/:questionId/answer/:answerId/accept` | Question Asker/Teacher | Mark answer as accepted |
| POST | `/api/qna/:questionId/answer/:answerId/vote` | Enrolled Users | Upvote/Downvote answer |

---

## 🎨 Frontend Components

### Pages

1. **QNA Tab in Course Detail** (`frontend/src/components/QNATab.jsx`)
   - Embedded in Course Detail page
   - Search bar and filters
   - List of questions
   - "Ask Question" button

2. **Question Detail Page** (`frontend/src/pages/QuestionDetail.jsx`)
   - Full question display
   - All answers with voting
   - Answer submission form
   - Edit/Delete controls

3. **My Questions Page** (`frontend/src/pages/MyQuestions.jsx`)
   - All questions asked by user across courses
   - Status tracking (answered, resolved)

### Components

1. **QNA List** (`frontend/src/components/QNAList.jsx`)
   - Question cards with metadata
   - Pagination
   - Sorting and filtering

2. **Ask Question Modal** (`frontend/src/components/AskQuestionModal.jsx`)
   - Form to create new question
   - File attachments
   - Tags input

3. **Vote Buttons** (`frontend/src/components/VoteButtons.jsx`)
   - Upvote/Downvote interface
   - Vote count display
   - Active state indication

4. **Edit Modals** (`frontend/src/components/EditQuestionModal.jsx`, `EditAnswerModal.jsx`)
   - Edit existing questions/answers

---

## 🔄 User Workflows

### Student Workflow

1. **Ask a Question:**
   - Navigate to Course Detail → QNA Tab
   - Click "Ask Question"
   - Fill form: title, description, tags, attachments
   - Submit
   - Receive notification when answered

2. **Answer a Question:**
   - Browse QNA or search
   - Click on question
   - Write answer in text area
   - Optionally add attachments
   - Submit answer

3. **Vote on Answers:**
   - View question detail
   - Click upvote/downvote on helpful/unhelpful answers
   - Helps surface best answers

4. **Mark Answer as Accepted:**
   - If you asked the question
   - Click "Accept Answer" on the most helpful response
   - Question marked as resolved

### Teacher Workflow

1. **Monitor Questions:**
   - View all questions in QNA tab
   - Filter by unanswered questions
   - Receive notifications for new questions

2. **Answer Questions:**
   - Provide authoritative answers as teacher
   - Add detailed explanations

3. **Pin Important Questions:**
   - Click "Pin" on important/common questions
   - Pinned questions appear at top
   - Helps reduce repeated questions

4. **Accept Answers:**
   - Can accept answers on any question
   - Ensures quality control

5. **Moderate:**
   - Edit or delete inappropriate content
   - Manage spam or off-topic posts

### TA Workflow

- Similar to students and teachers
- Can answer questions
- Can help moderate
- Cannot pin questions

---

## 💡 Features in Detail

### 1. Question Cards
Each question in the list shows:
- ✅ Question title (truncated)
- ✅ Asked by (name and role badge)
- ✅ Answer count (e.g., "3 answers")
- ✅ View count (e.g., "42 views")
- ✅ Tags (clickable for filtering)
- ✅ Timestamp ("asked 2 hours ago")
- ✅ Status badges: Resolved (green), Pinned (yellow)

### 2. Voting System
- **Upvote**: Indicates helpful answer (+1)
- **Downvote**: Indicates unhelpful answer (-1)
- **Net Score**: Total upvotes - downvotes
- **Sort by Votes**: Answers sorted by score
- **User Tracking**: User can only vote once per answer
- **Toggle Vote**: Can change from upvote to downvote

### 3. Accepted Answer
- **Green Badge**: "✓ Accepted Answer"
- **Appears First**: Accepted answer shown at top
- **One Per Question**: Only one answer can be accepted
- **Who Can Accept**: Question asker or course teacher
- **Auto-Resolve**: Marking answer as accepted sets isResolved: true

### 4. Pinned Questions
- **Yellow Badge**: "📌 Pinned"
- **Teacher Only**: Only teachers can pin
- **Appears at Top**: Pinned questions show first
- **Use Cases**: FAQs, important announcements, common issues

### 5. Tags System
- **Example Tags**: `lecture-5`, `arrays`, `midterm-prep`, `project`
- **Clickable**: Click tag to filter all questions with that tag
- **Popular Tags**: Show most used tags in filter sidebar
- **Multi-tag**: Questions can have multiple tags

### 6. Search Functionality
- **Search in**: Question title and description
- **Real-time**: Search as you type
- **Highlighting**: Highlight matching terms in results

### 7. Filters & Sorting
**Sort By:**
- Newest first
- Most viewed
- Most answered
- Unanswered only

**Filter By:**
- All questions
- Resolved only
- Unresolved only
- My questions only

### 8. Attachments
- **Supported Types**: Images (JPG, PNG), PDFs, Code files (.js, .py, .java), Documents
- **On Questions**: Help illustrate the problem
- **On Answers**: Provide code examples, diagrams, references
- **Size Limit**: 10MB per file
- **Preview**: Images show inline preview

### 9. View Counter
- **Increment**: +1 each time question detail page is opened
- **Unique Views**: Could be enhanced to track unique users (optional)
- **Popular Questions**: Sort by most viewed

### 10. Notifications
Send notification when:
- ✉️ Your question receives an answer
- ✉️ Your answer is accepted
- ✉️ Someone upvotes your answer (optional)
- ✉️ Teacher pins a question
- ✉️ New question posted in course (teachers/TAs only)

---

## 🎨 UI/UX Design Guidelines

### Question List
```
┌──────────────────────────────────────────────────┐
│ 🔍 Search questions...            [Ask Question] │
├──────────────────────────────────────────────────┤
│ Sort: [Newest ▼]  Filter: [All ▼]  Tags: [...]  │
├──────────────────────────────────────────────────┤
│ 📌 How to implement binary search in JavaScript? │
│ By: John Doe (Student) · 12 answers · 145 views │
│ [arrays] [lecture-5] [algorithms]                │
│ Asked 3 hours ago                                │
├──────────────────────────────────────────────────┤
│ ✓ What is the difference between var and let?   │
│ By: Jane Smith (Student) · 5 answers · 89 views │
│ [javascript] [variables]                         │
│ Asked 1 day ago · Resolved                       │
├──────────────────────────────────────────────────┤
│ ... more questions ...                           │
└──────────────────────────────────────────────────┘
```

### Question Detail
```
┌──────────────────────────────────────────────────┐
│ How to implement binary search in JavaScript?    │
│ By: John Doe (Student) · 145 views               │
│ [Edit] [Delete] [Pin]                            │
├──────────────────────────────────────────────────┤
│ I'm trying to implement binary search but...     │
│ (full question description)                      │
│ 📎 code-example.js                               │
│ [arrays] [lecture-5] [algorithms]                │
├──────────────────────────────────────────────────┤
│ 12 Answers                                       │
├──────────────────────────────────────────────────┤
│ ✓ Accepted Answer                                │
│ ↑ 15  ↓ 2                                        │
│ By: Teacher Name · 2 hours ago                   │
│ Here's a correct implementation...               │
│ (answer content)                                 │
│ [Edit] [Delete] [Accept Answer]                  │
├──────────────────────────────────────────────────┤
│ ↑ 8  ↓ 1                                         │
│ By: Student Name · 1 hour ago                    │
│ Another approach is to use...                    │
│ [Edit] [Delete]                                  │
├──────────────────────────────────────────────────┤
│ Your Answer:                                     │
│ ┌────────────────────────────────────────────┐  │
│ │ Write your answer here...                  │  │
│ └────────────────────────────────────────────┘  │
│ 📎 Add attachment    [Preview] [Submit Answer]  │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Implementation Checklist

### Backend (Phase 4.2)
- [ ] Create QNA model (`backend/models/QNA.js`)
- [ ] Create QNA controller (`backend/controllers/qnaController.js`)
- [ ] Create QNA routes (`backend/routes/qnaRoutes.js`)
- [ ] Implement file upload for attachments
- [ ] Add course enrollment verification middleware
- [ ] Test all endpoints with Postman
- [ ] Add notification triggers

### Frontend (Phase 4.4)
- [ ] Create QNA tab component
- [ ] Create questions list component
- [ ] Create ask question modal/form
- [ ] Create question detail page
- [ ] Create answer form component
- [ ] Create vote buttons component
- [ ] Create edit question/answer modals
- [ ] Implement search functionality
- [ ] Implement filters and sorting
- [ ] Add attachment upload/preview
- [ ] Style with Tailwind CSS
- [ ] Test all user flows
- [ ] Integrate with notification system

---

## 🚀 Benefits

1. **Reduces Email Overload** - Students ask publicly instead of emailing teacher
2. **Promotes Peer Learning** - Students help each other
3. **Searchable Knowledge Base** - Past Q&A helps future students
4. **Teacher Efficiency** - Answer once instead of answering same question multiple times
5. **Community Building** - Encourages interaction between students
6. **Quality Control** - Voting system surfaces best answers
7. **Organized by Course** - Each course has dedicated forum
8. **Encourages Engagement** - Students actively participate

---

## 📊 Future Enhancements (Optional)

- 🔔 Email digest of weekly popular questions
- 🏆 Gamification: Points for helpful answers
- 🔗 Markdown support for code formatting
- 🤖 AI-powered similar question suggestions
- 📈 Analytics dashboard (most active users, popular topics)
- 💬 Comments on answers (nested discussions)
- 🔖 Bookmark/Save questions
- 📱 Mobile app integration
- 🌐 Real-time updates with WebSocket
- 🔍 Advanced search with filters (date range, author, etc.)

---

## 🎓 Example Use Cases

### Use Case 1: Student Stuck on Assignment
**Scenario:** Student doesn't understand a concept from lecture

1. Student opens course → QNA tab
2. Searches existing questions (maybe already answered!)
3. If not found, clicks "Ask Question"
4. Writes: "How do I solve problem 3 in assignment 2?"
5. Adds screenshot of their attempt
6. Submits question
7. Receives answer from TA or peer within hours
8. Marks helpful answer as accepted
9. Assignment completed! 🎉

### Use Case 2: Teacher Proactive Support
**Scenario:** Teacher notices repeated confusion on a topic

1. Teacher posts question: "Common confusion about pointers - FAQ"
2. Provides detailed explanation as an answer
3. Pins the question to top of forum
4. All students see it immediately
5. Reduces individual questions by 70%

### Use Case 3: Collaborative Learning
**Scenario:** Difficult algorithm question

1. Student asks: "Best approach for pathfinding algorithm?"
2. Multiple students share different approaches
3. Discussion emerges through answers
4. Students upvote most elegant solution
5. Teacher adds authoritative answer with resources
6. Marks teacher's answer as accepted
7. Everyone learns multiple approaches

---

**This QNA feature transforms CampusOne into a true collaborative learning platform! 🎓✨**
