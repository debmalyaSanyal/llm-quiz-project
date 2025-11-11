/*
* FINAL PROJECT CODE
* This bot is designed to solve the demo quiz chain.
* For the real quiz, the logic inside the 'if/else if'
* blocks in 'solveQuiz' will need to be changed
* to solve the new, unknown tasks (e.g., using an LLM).
*/
require('dotenv').config();
const express = require("express");
const app = express();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const pdf = require('pdf-parse');

// Read secrets from .env file
const YOUR_STORED_SECRET = process.env.MY_SECRET;
const HF_TOKEN = process.env.HF_TOKEN; // Your 'write' token

app.use(express.json());
const PORT = 3000;

// This is the main endpoint that receives the quiz request
app.post("/api/quiz", (req, res) => {
  const providedSecret = req.body.secret;
  
  // 1. Check the secret
  if (providedSecret !== YOUR_STORED_SECRET) {
    console.log("...Secrets do NOT match. Rejecting request.");
    return res.status(403).json({
      message: "Forbidden: Invalid secret."
    });
  }

  // 2. Respond immediately with 200 OK
  console.log("...Secrets match! Request is valid.");
  res.status(200).json({
    message: "Request received successfully! Secret is valid."
  });

  // 3. Start solving the quiz in the background
  solveQuiz(req.body);
});

app.listen(PORT, () => {
  console.log(`Server is running locally on http://localhost:${PORT}`);
});


/**
 * Transcribes audio using the Hugging Face AI.
 * This is the correct solution for the demo's 3rd quiz.
 * Note: The free Hugging Face API is unreliable and may change.
 */
async function transcribeAudio(audioBuffer) {
    // This is the most stable combination of URL and model
    const API_URL = "https://api-inference.huggingface.co/models/facebook/wav2vec2-base-960h";
    
    console.log("Sending audio to wav2vec2 model...");
    
    try {
        const response = await axios.post(API_URL, audioBuffer, {
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/octet-stream"
            }
        });
        
        console.log("Hugging Face Response:", response.data);
        return response.data.text; // The transcribed text
        
    } catch (err) {
        // Safe error handling for JSON or HTML errors
        if (err.response && typeof err.response.data === 'object' && err.response.data.error) {
            console.error("Error during transcription (JSON):", err.response.data);
            if (err.response.data.error.includes("is currently loading")) {
                console.log("Model is loading, will retry in 15s...");
                await new Promise(resolve => setTimeout(resolve, 15000));
                return transcribeAudio(audioBuffer); // Retry
            }
        } else if (err.response) {
            console.error("Error during transcription (HTML/Other):", err.response.status, err.response.statusText);
        } else {
            console.error("Error during transcription:", err.message);
        }
        return "Transcription failed";
    }
}

/**
 * This is the main "brain" of the bot.
 * It scrapes a page, figures out the task, solves it, and calls itself
 * again if it receives a new quiz URL.
 */
async function solveQuiz(quizData) {

  console.log(`--- Starting Quiz for URL: ${quizData.url} ---`);

  try {
    const { origin } = new URL(quizData.url); 
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(quizData.url, { waitUntil: 'networkidle0' });
    const htmlContent = await page.$eval('body', el => el.innerHTML);
    const $ = cheerio.load(htmlContent);

    // Find the correct submit URL
    let submitUrl;
    const spanUrl = $('span.origin').first().text();
    if (spanUrl) {
        submitUrl = spanUrl + '/submit';
    } else {
        submitUrl = origin + '/submit';
    }
    console.log("Found Submit URL:", submitUrl);

    // --- Task Router ---
    // The bot looks for "clues" on the page to decide what to do.
    let answer; 
    const scrapeDataLink = $('a[href*="demo-scrape-data"]').attr('href');
    const audioLink = $('audio[src$=".opus"]').attr('src');
    const pdfLink = $('a[href$=".pdf"]').attr('href');

    if (scrapeDataLink) {
        // --- Task: Scrape (Demo Quiz 2) ---
        console.log("--- Scrape Task Detected ---");
        const secretUrl = new URL(scrapeDataLink, origin).href;
        await page.goto(secretUrl, { waitUntil: 'networkidle0' });
        const secretCode = await page.$eval('body', el => el.textContent);
        const match = secretCode.match(/(\d+)/); // Extract just the number
        answer = match[1]; 
        console.log("Found Secret Code:", answer);
        
    } else if (audioLink) {
        // --- Task: Audio (Demo Quiz 3) ---
        console.log("--- Audio Task Detected ---");
        const audioUrl = new URL(audioLink, origin).href;
        console.log(`Downloading audio from ${audioUrl}`);
        
        const audioBuffer = await axios.get(audioUrl, {
            responseType: 'arraybuffer'
        });
        
        answer = await transcribeAudio(audioBuffer.data);

    } else if (pdfLink) {
        // --- Task: PDF (For the real quiz) ---
        console.log("--- PDF Task Detected ---");
        const pdfUrl = new URL(pdfLink, origin).href;
        console.log(`Downloading PDF from ${pdfUrl}`);
        const pdfBuffer = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfData = await pdf(pdfBuffer.data);
        
        console.log("--- PDF Text (first 200 chars) ---");
        console.log(pdfData.text.substring(0, 200));

        // In the real quiz, you would send pdfData.text and the
        // question to an LLM to get the answer.
        answer = 12345; // Placeholder answer
        
    } else {
        // --- Task: Basic (Demo Quiz 1) ---
        console.log("--- Basic Demo Task. Submitting default answer. ---");
        answer = "This is my demo answer";
    }

    await browser.close();

    // --- Submit the Answer ---
    const answerPayload = {
      email: quizData.email,
      secret: quizData.secret,
      url: quizData.url,
      answer: answer
    };

    console.log("--- Submitting Answer to:", submitUrl, "---");
    console.log("Payload:", answerPayload);
    const response = await axios.post(submitUrl, answerPayload);
    console.log("--- Received Response from Submit URL ---");
    console.log("Data:", response.data);

    // --- Recurse if needed ---
    if (response.data.url) {
      console.log("--- CORRECT! Received new quiz URL. Proceeding... ---");
      const newQuizData = {
        email: quizData.email,
        secret: quizData.secret,
        url: response.data.url
      };
      // Wait for the delay (if any) before starting next quiz
      setTimeout(() => {
        solveQuiz(newQuizData);
      }, (response.data.delay || 0) * 1000); 
    } else {
      console.log("--- Quiz series complete! No new URL received. ---");
    }

  } catch (error) {
    if (error.response) {
      console.error("Error from submit server:", error.response.status, error.response.data);
    } else {
      console.error("Error during quiz solving:", error.message);
    }
  }
}
