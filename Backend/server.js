const express = require("express");
const cors = require("cors");

const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());


// ============================================================
// TEST ROUTE
// ============================================================

app.get("/", (req, res) => {

    res.json({
        message: "AI Email Copilot Backend is running"
    });

});


// ============================================================
// GENERATE EMAIL ROUTE
// ============================================================

app.post("/api/generate-email", (req, res) => {

    const {
        purpose,
        recipient,
        context,
        importantPoints,
        tone,
        formality,
        length,
        language
    } = req.body;


    // Check required fields

    if (
        !purpose ||
        !recipient ||
        !context ||
        !importantPoints ||
        !tone ||
        !formality ||
        !length ||
        !language
    ) {

        return res.status(400).json({
            error: "All email fields are required."
        });

    }


    // Temporary response
    // We will connect the AI core later.

    res.json({

        message: "Email data received successfully.",

        data: {
            purpose,
            recipient,
            context,
            importantPoints,
            tone,
            formality,
            length,
            language
        }

    });

});


// ============================================================
// START SERVER
// ============================================================

const PORT = 5000;

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});