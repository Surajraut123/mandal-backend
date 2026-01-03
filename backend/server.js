const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());


const route = require('./routes/users.route');

app.use('/api', route);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});