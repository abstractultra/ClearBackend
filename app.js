require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const vision = require("@google-cloud/vision");
const multer = require("multer");
const upload = multer({ dest: ".cache/" });

const port = process.env.PORT || 3000;

function convertToInt(likelihood) {
  switch (likelihood) {
    case "VERY_UNLIKELY":
      return 0;
    case "UNLIKELY":
      return 1;
    case "LIKELY":
      return 2;
    case "VERY_LIKELY":
      return 3;
    default:
      return 0;
  }
}

async function getEmotion(imageUrl) {
  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.faceDetection(imageUrl);
  const faces = result.faceAnnotations;
  return faces;
}

app.post("/getMood", upload.single("image"), (req, res) => {
  if (!fs.existsSync(path.join(__dirname, 'google_credentials.json'))) {
    fs.writeFileSync(
      path.join(__dirname, "google_credentials.json"),
      process.env.GOOGLE_CREDENTIALS
    );
  }
  getEmotion(req.file.path).then((faces) => {
    const face = faces[0];
    const likelihood = {
      joy: convertToInt(face.joyLikelihood),
      angry: convertToInt(face.angerLikelihood),
      sad: convertToInt(face.sorrowLikelihood),
      surprised: convertToInt(face.surpriseLikelihood),
    };
    const highestProbability = Math.max(
      likelihood.joy,
      likelihood.angry,
      likelihood.sad,
      likelihood.surprised
    );
    const mostLikely = (function () {
      for (let [key, value] of Object.entries(likelihood)) {
        if (value === highestProbability) return key;
      }
    })();
    const data = {
      likelihood,
      mostLikely,
    };
    fs.unlinkSync(req.file.path);
    res.json(data);
  });
});

app.listen(port, () => {
  if (!fs.existsSync(path.join(__dirname, 'google_credentials.json'))) {
    fs.writeFileSync(
      path.join(__dirname, "google_credentials.json"),
      process.env.GOOGLE_CREDENTIALS
    );
  }
  console.log(`Listening on port ${port}`);
});
