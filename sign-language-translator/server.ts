import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with increased limit for base64 image uploads
app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI SDK with telemetry headers
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Endpoint 1: Translate a sign language image/gesture using Gemini 3.5 Flash
app.post("/api/translate-sign", async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured. Please add it in Settings > Secrets.",
    });
  }

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    // Clean up base64 prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      You are an expert Indian Sign Language (ISL) and global sign language interpreter.
      Analyze this image of a hand sign or gesture (which could be single-handed or double-handed).
      
      Look closely for standard Indian Sign Language (ISL) words or gestures, such as:
      - "NAMASTE" (folded hands meeting at the palm in front of chest)
      - "DHANYAVAAD" / "THANK YOU" (flat hand touching forehead or chin and moving outward, or folded hands with a polite bow)
      - "PAANI" / "WATER" (fingers showing sipping/liquid motion near mouth, or index/middle/ring extended and pinky curled)
      - "KHAANA" / "FOOD" (fingertips bunched together and brought towards the mouth, or eating hand gesture)
      - "MADAD" / "HELP" (one clenched fist resting on top of a flat supportive palm)
      - "GHAR" / "HOME" (both hands' flat palms meeting at an angle to represent a roof or house)
      - "PYAAR" / "LOVE" (crossed arms over the chest, or index fingers forming a heart)
      - "DOST" / "FRIEND" (both hands clasping, shaking, or holding each other)
      - "BHAI" / "BROTHER" or "BEHEN" / "SISTER"
      - Standard alphabets (A-Z) or numeric symbols.

      Identify the single Indian Sign Language (ISL) word, phrase, or letter being demonstrated. If it's a global/ASL sign, translate it as well but prefer Indian Sign Language (ISL) terminology where relevant (e.g. NAMASTE, DHANYAVAAD, PAANI, KHAANA, GHAR, MADAD, DOST).

      Respond STRICTLY in JSON format with the following fields:
      1. "detectedSign": A short string representing the single letter or word detected (e.g. "NAMASTE", "DHANYAVAAD", "PAANI", "KHAANA", "GHAR", "MADAD", "DOST", "A", "HELLO", "WATER"). If no clear gesture is detected, say "UNKNOWN".
      2. "confidence": A number between 0 and 100 representing your confidence.
      3. "description": A brief 1-2 sentence description explaining what handshape/movement you see and why you mapped it to this Indian Sign Language (ISL) sign.
      4. "alternativeInterpretations": An array of strings with other possible letters/words if the sign is ambiguous.
    `;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    // Parse and send the structured JSON response
    const parsedData = JSON.parse(text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/translate-sign:", error);
    res.status(500).json({ error: error.message || "Failed to translate sign language image" });
  }
});

// Endpoint 2: Connect a list of sign glosses/letters into a correct grammatically standard sentence
app.post("/api/connect-sentence", async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured. Please add it in Settings > Secrets.",
    });
  }

  try {
    const { rawGlosses } = req.body; // e.g. ["HELLO", "I", "WANT", "WATER", "PLEASE"] or ["Y", "O", "U", "GO", "WHERE"]
    if (!rawGlosses || !Array.isArray(rawGlosses) || rawGlosses.length === 0) {
      return res.status(400).json({ error: "Missing or invalid rawGlosses array" });
    }

    const glossListString = rawGlosses.join(" ");

    const prompt = `
      You are an AI assistant designed to help translate deaf or hard-of-hearing sign language sequences (glosses) into fluent, grammatically correct spoken English sentences.
      The user has entered or captured the following raw sign glosses/letters/fragments: "${glossListString}"

      Convert this raw sequence into:
      1. A natural, standard, grammatically correct English sentence.
      2. Fill in helper words, verb tenses, pronouns, and punctuation that might be missing in raw glosses or fingerspelling.
      3. Maintain the exact original intent and tone of the signs.

      Respond STRICTLY in JSON format with the following fields:
      - "correctedSentence": The polished and complete English sentence.
      - "originalGlosses": The original raw list you processed.
      - "explanation": A very brief 1-sentence note of what adjustments were made (e.g. "Added verb conjugation and prepositions").
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsedData = JSON.parse(text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/connect-sentence:", error);
    res.status(500).json({ error: error.message || "Failed to refine sign sequence" });
  }
});

// Endpoint 3: High-quality AI Voice Text-To-Speech (using Gemini TTS)
app.post("/api/generate-tts", async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API key is not configured. Please add it in Settings > Secrets.",
    });
  }

  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to speak" });
    }

    const selectedVoice = voice || "Zephyr"; // Puck, Charon, Kore, Fenrir, Zephyr

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say naturally and clearly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio payload returned from Gemini TTS model");
    }

    res.json({ base64Audio, voice: selectedVoice });
  } catch (error: any) {
    console.error("Error in /api/generate-tts:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI Voice audio" });
  }
});

// Serve frontend build static files in production, use Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
