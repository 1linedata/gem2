import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper function to forward requests
const forwardRequest = async (url, body) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
        // Attempt to parse nested error messages from the webhook's response
        const nestedOutput = data[0]?.output;
        let errorMessage = 'Webhook operation failed';
        if (nestedOutput) {
            try {
                const parsedOutput = JSON.parse(nestedOutput);
                errorMessage = parsedOutput.message || errorMessage;
            } catch (e) {
                errorMessage = nestedOutput; // If it's not JSON, use the raw string
            }
        } else {
            errorMessage = data.message || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return data;
};

// --- API PROXY ROUTES ---

// 1. User Data Proxy
app.post('/api/users/:action', async (req, res) => {
    const { action } = req.params;
    const prompt = `task: ${action} - data: ${JSON.stringify(req.body)}`;
    try {
        const data = await forwardRequest(process.env.USER_DATA_WEBHOOK_URL, { prompt });
        const outputString = data[0]?.output || data.output || '{}';
        const output = JSON.parse(outputString);
        res.status(200).json(output);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. Get Ads Data Proxy
app.get('/api/ads', async (req, res) => {
    try {
        const response = await fetch(process.env.GET_ADS_WEBHOOK_URL, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error('Failed to fetch ads data from webhook');
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 3. Chat Proxy
app.post('/api/chat', async (req, res) => {
    const { message, email, threadId } = req.body;
    const payload = { prompt: message, email, threadid: threadId };
    try {
        const data = await forwardRequest(process.env.CHAT_WEBHOOK_URL, payload);
        res.json({ reply: data[0]?.output || "Sorry, I couldn't get a response." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 4. Gemini AI Analysis Proxy
app.post('/api/analyze', async (req, res) => {
    const { data, context } = req.body;
    const prompt = `Based on the context '${context}', analyze the following data and provide insights in Vietnamese: ${JSON.stringify(data.slice(0, 20))}`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Gemini API request failed');
        
        const analysis = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        res.json({ analysis: analysis || "Không thể tạo phân tích." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
