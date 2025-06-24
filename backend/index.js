require('dotenv').config();  

const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const BUCKET = process.env.BUCKET;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;


const upload = multer({ storage: multer.memoryStorage() });


app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const username = req.body.username;
    const file = req.file;

    if (!username || !file) {
      return res.status(400).send('Username and file are required.');
    }

    const safeFileName = file.originalname.replace(/\s+/g, '_');
    const key = `${username}/${safeFileName}`;

    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();
    res.send(`File uploaded: ${key}`);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send('Upload failed');
  }
});


app.get('/transcript/:username/:filename', async (req, res) => {
  const { filename } = req.params;

  const safeFilename = filename.replace(/\s+/g, '_');
  const txtFilename = safeFilename.replace(/\.(mp3|mp4)$/i, '.txt');
  const key = txtFilename;

  try {
    const data = await s3.getObject({
      Bucket: OUTPUT_BUCKET,
      Key: key,
    }).promise();

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${txtFilename}"`,
    });
    res.send(data.Body.toString());
  } catch (err) {
    console.error('Transcript fetch error:', err);
    res.status(404).send('Transcript not ready or not found.');
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

