const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
  },
});

// Routes
// From InlineForm.js to DB

app.post('/formData', (req, res) => {
  let formDataArray = req.body;

  if (!Array.isArray(formDataArray)) {
    formDataArray = [formDataArray];
  }

  const processShift = (shift) => {
  const requiredFields = ['Email', 'Position', 'Date', 'Outbound', 'Inbound'];
  const missingFields = requiredFields.filter(field => !shift[field]);

  if (missingFields.length > 0) {
    return Promise.resolve({ error: 'Incomplete form data', missingFields });
  }

  return db('Swaps')
    .insert({ ...shift, Sent: new Date() })
    .then(insertedData => {
      return { message: 'Form received and stored successfully', data: insertedData[0] };
    })
    .catch(error => {
      return { error: 'Internal Server Error' };
    });
};

const processShifts = () => {
  const promises = formDataArray.map(processShift);

  Promise.all(promises)
    .then(results => res.status(200).json(results))
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
};

processShifts();
});

// From DB to DayBox.js

app.get('/formData/:date', (req, res) => {
  const date = req.params.date;

  db('Swaps')
    .select()
    .where('Date', date)
    .orderBy('Sent', 'desc')
    .then(data => {
      const formatedData = data.map(entry => ({
        ...entry,
        Date: new Date(entry.Date).toLocaleDateString(),
        Sent: new Date(entry.Sent).toLocaleString()
      }));
      res.status(200).json({ data: formatedData });
    })
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
