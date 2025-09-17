Polling App

A simple Node.js + MongoDB polling application with JWT-based authentication, allowing users to create polls, vote, and view results.

Features

User Authentication

Register and login using email and password

JWT-based authentication for protected routes

Poll Management

Create, update, view, and delete polls

Each poll has multiple options and a start/end date

Voting

Users can vote on active polls

Each user can vote only once per poll

Atomic vote updates to ensure accurate counts

Results

View results of closed polls

Tech Stack

Backend: Node.js, Express.js

Database: MongoDB (Mongoose ODM)

Authentication: JWT (JSON Web Token)

Password Hashing: bcrypt

Folder Structure
polling-app/
├── controllers/       # Controllers for polls and authentication
├── middleware/        # Auth middleware
├── models/            # Mongoose models: User, Poll, Vote
├── routes/            # Express routes
├── .gitignore         # Ignore node_modules and IDE files
├── .env               # Environment variables
├── package.json
├── package-lock.json
└── server.js          # Main server file

Installation

Clone the repository:

git clone https://github.com/YOUR_USERNAME/polling-app.git
cd polling-app


Install dependencies:

npm install


Create a .env file with:

PORT=5000
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_jwt_secret>
JWT_EXPIRES_IN=7d


Start the server:

npm start

API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Login and get JWT
Polls
Method	Endpoint	Description
POST	/api/polls	Create a new poll (auth required)
GET	/api/polls?status=active|closed	List polls (filter by status)
GET	/api/polls/:pollId	View poll details
PUT	/api/polls/:pollId	Update a poll (auth required)
DELETE	/api/polls/:pollId	Delete a poll (auth required)
Voting
Method	Endpoint	Description
POST	/api/polls/:pollId/vote	Vote on a poll (auth required)
GET	/api/polls/:pollId/results	View results of closed poll
Sample Poll JSON
{
  "question": "Which backend technology do you prefer?",
  "options": ["Node.js", "Django", "Spring Boot"],
  "startDate": "2025-09-18T09:00:00.000Z",
  "endDate": "2025-09-21T09:00:00.000Z"
}
Notes

Make sure startDate is before endDate.

Only active polls can be voted on.

Each user can vote once per poll.
