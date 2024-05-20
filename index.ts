import express from 'express';
import dotenv from "dotenv";
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { VideoInfosDTO } from './DTO/VideoInfosDTO';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to allow CORS requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', "*"); //  http://localhost:3000/ 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

// Access to a video file
app.get('/video/:name', (req, res) => {
  const { name } = req.params;
  if (!name) {
    return res.status(400).send('name parameter is missing.');
  }

  const videoPath = path.resolve(__dirname, '..', 'uploads', name as string);

  res.sendFile(videoPath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error sending file.');
    }
  });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Upload and compress video
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
      const inputFilePath = req.file.path;
    const outputFileName = 'low-res-' + req.file.filename; 
    const outputFilePath = path.join('uploads', outputFileName); 
    ffmpeg(inputFilePath)
      .size('320x180')
      .output(outputFilePath)
      .on('end', () => {
        fs.unlink(inputFilePath, (err) => {
          if (err) {
            console.error('Error deleting original file:', err);
          }
          res.json({ message: 'Low-res video created successfully', filename: outputFilePath });
        });
      })
      .on('error', (err) => {
        console.error('Error generating low-res video:', err);
        res.status(500).json({ message: 'Error generating low-res video' });
      })
      .run();
});


// Get all video files name
app.get('/files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ message: 'Error reading directory' });
    }
    const videoFileNames: VideoInfosDTO[] = files.map(file => ({
      name: file // Return the full file name including extension
    }));
    res.json(videoFileNames);
  });
});


// Get a video by file name
app.get('/files/:name', (req, res) => {
  const { name } = req.params;
  console.log(name, name);

  if (name) {
    const videoFilePath = path.resolve(__dirname,'..', 'uploads', name);

    fs.access(videoFilePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error('Video file not found:', err);
        return res.status(404).json({ message: 'Video file not found' });
      }
      res.sendFile(videoFilePath);
    });
  }
});


app.get('/', (req, res) => {
    res.json({ message: "Server running" });
  });

app.listen(PORT, () => { 
    console.log("Server running"); 
  }).on("error", (error) => {
    throw new Error(error.message);
});
