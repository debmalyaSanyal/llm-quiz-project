# LLM Analysis Quiz Bot 🤖

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge&logo=node.js)
![Framework](https://img.shields.io/badge/Express.js-4.x-grey?style=for-the-badge&logo=express)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

This is a Node.js bot built to compete in the **LLM Analysis Quiz**. It's an automated server that can receive quiz tasks via a POST request, use a headless browser to scrape dynamic web pages, intelligently identify the task type, and recursively solve an entire chain of quizzes.

---

## 🚀 Features

* **Secure API Endpoint:** Listens on `/api/quiz` and validates incoming requests using a shared `secret`.
* **Dynamic Scraping:** Uses **Puppeteer** to run a headless browser, allowing it to render and scrape JavaScript-heavy pages.
* **Recursive Solving:** Can handle a *chain* of quizzes. After solving one quiz, it checks the response for a new URL and automatically starts the next task.
* **Smart Task Router:** Intelligently parses the scraped HTML with **Cheerio** to detect the type of task (e.g., simple scrape, audio transcription) and execute the correct logic.
* **AI-Powered:** Uses the **Hugging Face Inference API** to perform AI-driven analysis, such as transcribing audio files to find the answer.

---

## 🛠️ Technology Stack

* **Server:** Node.js, Express.js
* **Web Scraping:** Puppeteer (headless browser), Cheerio (HTML parsing)
* **API & Data:** Axios (for POST/GET requests), `csv-parse` (for CSV data), `pdf-parse` (for PDF text)
* **Secrets Management:** `dotenv`
* **AI/LLM:** Hugging Face Inference API (for audio transcription)
* **Tunnelling:** `ngrok` (to expose the local server to the internet)

---

## 🏃‍♂️ Getting Started

### 1. Prerequisites

* You must have **[Node.js](https://nodejs.org/)** (v18 or higher) installed on your computer.
* You must have a free **[ngrok](https://ngrok.com/)** account to create a public URL.
* You must have a free **[Hugging Face](https://huggingface.co/)** account to get an API token.

### 2. Installation

1.  Download the code and open the `llm-quiz-project` folder in VS Code.
2.  Open a terminal in VS Code and install all the project dependencies by running:
    ```bash
    npm install
    ```

### 3. Set Up Your Secrets

This project requires **two** secret keys to run.

1.  Create a new file in the root of the project named **`.env`**
2.  Copy and paste the following into that file, adding your own values:

    ```env
    # This is the secret string you will also put in the Google Form
    MY_SECRET=super-secret-123

    # This is your API token from Hugging Face
    # It MUST have the "write" permission/role
    HF_TOKEN=hf_...YOUR...NEW...WRITE...TOKEN...HERE
    ```

---

## 🛰️ How to Run (Quiz Day Instructions)

This bot **requires two terminals** to be running at the same time.

### Terminal 1: Start the Server

In your first VS Code terminal, start the bot:

```bash
node index.js
````

You should see this message:
`Server is running locally on http://localhost:3000`

### Terminal 2: Start the `ngrok` Tunnel

In a *second* VS Code terminal, run `ngrok` to expose your server to the internet.

```bash
ngrok http 3000
```

`ngrok` will give you a public "Forwarding" URL. This is your API endpoint:

`Forwarding -> https://something-random.ngrok-free.app`

### Your Final API Endpoint URL

The URL to submit to the Google Form is your `ngrok` URL + the `/api/quiz` path:

**`https://something-random.ngrok-free.app/api/quiz`**


## 🧠 How It Works: The Task Router

The core logic is in the `solveQuiz` function. It acts as a "smart" router:

1.  **Scrape:** It uses Puppeteer to open the quiz URL and render all JavaScript.
2.  **Detect:** It uses Cheerio to scan the HTML for "clues" (like an `<audio>` tag, a specific `<a>` link, or a PDF link).
3.  **Route:** Based on the clues, it "routes" to the correct function:
      * If it finds a `demo-scrape-data` link, it runs the **scrape logic**.
      * If it finds an `<audio src="...opus">` tag, it runs the **audio transcription logic**.
      * If it finds a `...pdf` link, it will run the **PDF parsing logic** (this is built for the real quiz).
4.  **Solve:** It executes the task (e.g., calls the Hugging Face AI) to get the answer.
5.  **Submit:** It `POST`s the correct answer to the `/submit` URL.
6.  **Recurse:** If the submission response contains a *new* `url`, the bot calls `solveQuiz` all over again with the new URL, starting the process over.


## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
