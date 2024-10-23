const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const authMidddleware = require("../middleware/Auth")

router.get("/board", authMidddleware, async (req, res) => {
    console.log(req)
    res.status(200).json({ message: "hello from raw" })
})

module.exports = router;
