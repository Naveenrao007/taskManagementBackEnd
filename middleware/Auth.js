const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config()
const authMidddleware = (req, res, next) => {
    console.log("i am logged In")
    console.log(res.headers)
    const token = req.headers.authorization;
    console.log("token", token);
    if (!token) {
        return res.status(400).json({ message: "User not logged In" })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded.id;
        next()
    } catch (error) {
        res.status(400).json({ message: " Invalid Token" })
    }
}

module.exports = authMidddleware