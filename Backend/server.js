const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { spawn } = require("child_process");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {

    res.json({
        message: "AI Email Generator Backend is running"
    });

});


// ============================================================
// GENERATE EMAIL API
// ============================================================

app.post("/api/generate-email", (req, res) => {

    const emailData = req.body;


    // ========================================================
    // REQUEST BODY VALIDATION
    // ========================================================

    if (
        !emailData ||
        typeof emailData !== "object" ||
        Array.isArray(emailData)
    ) {

        return res.status(400).json({
            error: "Invalid request body."
        });

    }


    // ========================================================
    // REQUIRED FIELDS
    // ========================================================

    const requiredFields = [
        "purpose",
        "recipient",
        "context",
        "importantPoints",
        "tone",
        "formality",
        "length",
        "language"
    ];


    // ========================================================
    // REQUIRED FIELD VALIDATION
    // ========================================================

    for (const field of requiredFields) {

        if (
            typeof emailData[field] !== "string" ||
            !emailData[field].trim()
        ) {

            return res.status(400).json({
                error: `${field} is required.`
            });

        }

    }


    // ========================================================
    // INPUT LENGTH VALIDATION
    // ========================================================

    const MAX_INPUT_LENGTH = 3000;

    for (const field of requiredFields) {

        if (emailData[field].length > MAX_INPUT_LENGTH) {

            return res.status(400).json({
                error: `${field} is too long. Maximum allowed length is 3000 characters.`
            });

        }

    }


    // ========================================================
    // START PYTHON PROCESS
    // ========================================================

    let pythonProcess;

    try {

        pythonProcess = spawn(
            "python",
            ["../src/main.py"]
        );

    } catch (error) {

        console.error(
            "Could not start Python process:",
            error
        );

        return res.status(500).json({
            error: "AI service could not be started."
        });

    }


    let output = "";
    let errorOutput = "";


    // ========================================================
    // SEND DATA TO PYTHON
    // ========================================================

    try {

        pythonProcess.stdin.write(
            JSON.stringify(emailData)
        );

        pythonProcess.stdin.end();

    } catch (error) {

        console.error(
            "Failed to send data to Python:",
            error
        );

        return res.status(500).json({
            error: "Failed to communicate with AI service."
        });

    }


    // ========================================================
    // RECEIVE PYTHON OUTPUT
    // ========================================================

    pythonProcess.stdout.on("data", (data) => {

        output += data.toString();

    });


    // ========================================================
    // RECEIVE PYTHON ERRORS
    // ========================================================

    pythonProcess.stderr.on("data", (data) => {

        errorOutput += data.toString();

    });


    // ========================================================
    // PYTHON PROCESS ERROR
    // ========================================================

    pythonProcess.on("error", (error) => {

        console.error(
            "Python process error:",
            error
        );

        if (!res.headersSent) {

            return res.status(500).json({
                error: "AI service could not be started."
            });

        }

    });


    // ========================================================
    // PYTHON PROCESS FINISHED
    // ========================================================

    pythonProcess.on("close", (code) => {

        // ----------------------------------------------------
        // Python failed
        // ----------------------------------------------------

        if (code !== 0) {

            console.error(
                "Python process failed."
            );

            console.error(
                "Python error:",
                errorOutput
            );

            if (!res.headersSent) {

                return res.status(500).json({
                    error: "AI service failed while generating the email."
                });

            }

            return;

        }


        // ====================================================
        // PARSE PYTHON RESPONSE
        // ====================================================

        try {

            const result = JSON.parse(output);


            // ------------------------------------------------
            // Python returned an error
            // ------------------------------------------------

            if (result.error) {

                return res.status(400).json({
                    error: result.error
                });

            }


            // ------------------------------------------------
            // Validate AI response
            // ------------------------------------------------

            if (
                !result.subject ||
                typeof result.subject !== "string" ||
                !result.body ||
                typeof result.body !== "string"
            ) {

                return res.status(500).json({
                    error: "Invalid email response received from AI."
                });

            }


            // ------------------------------------------------
            // Successful response
            // ------------------------------------------------

            return res.status(200).json({

                success: true,

                data: {
                    subject: result.subject,
                    body: result.body
                }

            });

        }


        // ----------------------------------------------------
        // Invalid JSON
        // ----------------------------------------------------

        catch (error) {

            console.error(
                "Invalid JSON received from Python:"
            );

            console.error(output);

            return res.status(500).json({
                error: "Invalid response received from AI service."
            });

        }

    });

});


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {

    console.log(
        `Backend server running on http://localhost:${PORT}`
    );

});