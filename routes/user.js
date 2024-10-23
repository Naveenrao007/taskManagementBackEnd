const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const User = require("../schema/user.shcema");

// registration  func
router.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, password } = req.body;
    try {
        const isUserExists = await User.findOne({ email });
        if (isUserExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        return res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "A user with this email already exists",
                keyValue: error.keyValue,
            });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// login  func
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Wrong email or password" });
        }
        const isPasswordMatch =  bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Wrong email or password" });
        }
        const payload = { email: user.email };
        const token = jsonwebtoken.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({
            message: "User logged in successfully",
            token: token
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
module.exports = router;
