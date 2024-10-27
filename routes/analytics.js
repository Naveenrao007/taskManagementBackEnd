const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const authMiddleware = require("../middleware/Auth")

router.get("/analytics", authMiddleware, async (req, res) => {
    console.log(req)
    res.status(200).json({ message: "hello analytics" }) 
})

module.exports = router;
