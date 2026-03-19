const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;;
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(express.json());

app.use('/uploads', express.static('uploads'));

const frontendURL = process.env.FRONTEND_URL || `http://localhost:${port}`;
  
const allowedOrigins = ['http://localhost:5173', frontendURL];


app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));



const route = require('./routes/users.route');

app.use('/api', route);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});